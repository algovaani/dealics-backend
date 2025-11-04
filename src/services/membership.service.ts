import { Membership } from "../models/membership.model.js";
import { MembershipUser } from "../models/membership_user.model.js";
import { Transaction } from "../models/transactions.model.js";
import { sequelize } from "../config/db.js";

export class MembershipService {
  // Fetch all memberships. By default, only active memberships (status='1') are returned.
  static async getAll(activeOnly = true) {
    try {
      const where: any = {};
      if (activeOnly) where.status = '1';

      const memberships = await Membership.findAll({ where, order: [['price', 'ASC']] });
      return memberships;
    } catch (error) {
      throw error;
    }
  }

  // Fetch a single membership by primary key
  static async getById(id: number) {
    return await Membership.findByPk(id);
  }

  /**
   * Purchase membership: create membership_user entry and a transaction record.
   * Assumptions:
   * - membership duration: 'Pro Collector' => 1 year; 'Free' => no expiry (null)
   * - userId is taken from token (controller should pass it)
   */
  static async purchaseMembership(userId: number, paymentId: string, membershipId: number, amount: number, months?: number) {
    const t = await sequelize.transaction();
    try {
      const membership = await Membership.findByPk(membershipId, { transaction: t });
      if (!membership) {
        await t.rollback();
        throw new Error('Membership not found');
      }

      // Determine expiry date.
      // If months is provided, add that many months to now. Otherwise fall back to membership.type rules
      let expiredDate: string | null = null;
      const now = new Date();
      if (typeof months === 'number' && months > 0) {
        const exp = new Date(now.getTime());
        // Add months while preserving day where possible
        exp.setMonth(exp.getMonth() + months);
        expiredDate = exp.toISOString().slice(0, 10);
      } else if ((membership.type as string) === 'Pro Collector') {
        const nextYear = new Date(now.getTime());
        nextYear.setFullYear(now.getFullYear() + 1);
        // Format as YYYY-MM-DD for DATEONLY
        expiredDate = nextYear.toISOString().slice(0, 10);
      }

      // Create membership_user entry
      const membershipUser = await MembershipUser.create({
        user_id: userId,
        membership_id: membershipId,
        expired_date: expiredDate,
        type: membership.type,
        status: '1'
      } as any, { transaction: t });

      // Create transaction record
      const tx = await Transaction.create({
        user_id: userId,
        payment_id: paymentId,
        amount: amount,
        type: 'Purchase',
        note: `Membership purchased`,
        status: '1'
      } as any, { transaction: t });

      await t.commit();
      return { membershipUser, transaction: tx };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}
