import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category_title: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category_title,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const { total } = await transactionsRepository.getBalance();

    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('Invalid type transaction');
    }

    if (type === 'outcome' && value > total) {
      throw new AppError('You do not have enough balance');
    }

    let category = await categoriesRepository.findOne({
      where: { title: category_title },
    });

    if (!category) {
      category = categoriesRepository.create({ title: category_title });
    }

    category = await categoriesRepository.save(category);

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: category.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
