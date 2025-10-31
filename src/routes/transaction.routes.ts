import express from 'express';
import transactionController from '../controllers/transaction.controller.js';
import { userAuth } from "../middlewares/auth.middleware.js";
import { noCache } from "../middlewares/noCache.middleware.js";

const router = express.Router();
router.use(noCache);
// Get user's own transactions
router.get('/my-transactions', userAuth, transactionController.getUserTransactions);

// Get specific transaction by id (only if it belongs to the user)
router.get('/:id', userAuth, transactionController.getTransactionById);

export default router;