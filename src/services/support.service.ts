import { Support } from '../models/index.js';

export class SupportService {
  /**
   * Create a new support ticket
   */
  async createSupportTicket(
    supportData: {
      first_name: string;
      last_name: string;
      email: string;
      subject: string;
      comment: string;
      user_id?: number;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const createData: any = {
        first_name: supportData.first_name,
        last_name: supportData.last_name,
        email: supportData.email,
        subject: supportData.subject,
        comment: supportData.comment,
        support_request_status: 'New',
        support_status: '1'
      };

      if (supportData.user_id) {
        createData.user_id = supportData.user_id;
      }

      const supportTicket = await Support.create(createData);

      return {
        success: true,
        data: supportTicket
      };

    } catch (error: any) {
      console.error('Error creating support ticket:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get support tickets by user ID
   */
  async getSupportTicketsByUserId(userId: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const supportTickets = await Support.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      return {
        success: true,
        data: supportTickets
      };

    } catch (error: any) {
      console.error('Error fetching support tickets:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all support tickets (admin only)
   */
  async getAllSupportTickets(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const supportTickets = await Support.findAll({
        order: [['created_at', 'DESC']]
      });

      return {
        success: true,
        data: supportTickets
      };

    } catch (error: any) {
      console.error('Error fetching all support tickets:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Update support ticket status
   */
  async updateSupportTicketStatus(
    ticketId: number, 
    status: 'New' | 'Resolved' | 'On Hold'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const supportTicket = await Support.findByPk(ticketId);
      
      if (!supportTicket) {
        return {
          success: false,
          error: 'Support ticket not found'
        };
      }

      supportTicket.support_request_status = status;
      await supportTicket.save();

      return {
        success: true,
        data: supportTicket
      };

    } catch (error: any) {
      console.error('Error updating support ticket status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}
