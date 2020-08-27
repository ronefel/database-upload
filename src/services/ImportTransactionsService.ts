import csvParse from 'csv-parse';
import path from 'path';
import fs from 'fs';
import { getRepository, In, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  fileName: string;
}

interface CSVImport {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category_title: string;
}
class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const csvFilePath = path.join(uploadConfig.directory, fileName);
    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const CSVTransactions: CSVImport[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category_title] = line;
      if (!title || !type || !value) return;
      CSVTransactions.push({ title, type, value, category_title });
      categories.push(category_title);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));
    fs.promises.unlink(csvFilePath);

    if (!CSVTransactions.length) {
      return [];
    }

    const existCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    const existCategoriesTitle = existCategories.map(
      category => category.title,
    );

    const addCategories = categories
      .filter(category => !existCategoriesTitle.includes(category))
      .filter((value, index, obj) => obj.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategories.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const allCategories = [...newCategories, ...existCategories];

    const transactions = transactionsRepository.create(
      CSVTransactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category_title,
        ),
      })),
    );

    await transactionsRepository.save(transactions);

    return transactions;
  }
}
export default ImportTransactionsService;
