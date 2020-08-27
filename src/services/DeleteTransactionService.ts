import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    try {
      const transaction = await transactionsRepository.find({ id });

      await transactionsRepository.remove(transaction);
    } catch (error) {
      throw new AppError('Invalid id');
    }
  }
}

export default DeleteTransactionService;
