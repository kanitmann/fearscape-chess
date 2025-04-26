import { Router } from 'express';
import authRoutes from './authRoutes';
import gameRoutes from './gameRoutes';
import userRoutes from './userRoutes';

const router = Router();

// API version prefix
const API_PREFIX = '/api/v1';

// Routes
router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/games`, gameRoutes);
router.use(`${API_PREFIX}/users`, userRoutes);

export default router;