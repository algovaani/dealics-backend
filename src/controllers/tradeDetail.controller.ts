import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { TradeProposal } from '../models/tradeProposal.model.js';
import { User } from '../models/user.model.js';
import { TradingCard } from '../models/tradingcard.model.js';
import { Category } from '../models/category.model.js';
import { Shipment } from '../models/shipment.model.js';
import { TradeProposalStatus } from '../models/tradeProposalStatus.model.js';
import { sendApiResponse } from '../utils/apiResponse.js';
import { setTradeProposalStatus } from '../services/tradeStatus.service.js';

// Get Trade Detail API (matches Laravel get_receive_trade_detail)
export const getTradeDetail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { card_id, trade_id } = req.query;

    if (!userId) {
      return sendApiResponse(res, 401, false, "User not authenticated", []);
    }

    if (!trade_id) {
      return sendApiResponse(res, 400, false, "Trade ID is required", []);
    }

    // Get trade proposal with relations
    const tradeProposal = await TradeProposal.findByPk(trade_id as string, {
      include: [
        {
          model: User,
          as: 'tradeSender',
          attributes: ['id', 'first_name', 'last_name', 'username', 'profile_picture']
        },
        {
          model: User,
          as: 'tradeReceiver',
          attributes: ['id', 'first_name', 'last_name', 'username', 'profile_picture']
        },
        {
          model: TradeProposalStatus,
          as: 'tradeProposalStatus',
          attributes: ['id', 'alias', 'name', 'to_sender', 'to_receiver']
        }
      ]
    });

    if (!tradeProposal) {
      return sendApiResponse(res, 404, false, "Trade proposal not found", []);
    }

    // Set trade as viewed
    await setTradeProposalStatus(tradeProposal.id, 'trade-viewed');
    await setTradeProposalStatus(tradeProposal.id, 'counter-offer-viewed');

    // Determine send and receive cards based on user role
    let sendCards: number[] = [];
    let receiveCards: number[] = [];

    if (tradeProposal.trade_sent_by === userId) {
      // User is sender, so they receive what they originally sent
      sendCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
      receiveCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
    } else {
      // User is receiver, so they send what they originally received
      sendCards = tradeProposal.send_cards ? tradeProposal.send_cards.split(',').map(id => parseInt(id.trim())) : [];
      receiveCards = tradeProposal.receive_cards ? tradeProposal.receive_cards.split(',').map(id => parseInt(id.trim())) : [];
    }

    // Get trading cards details
    const receivedProducts = await TradingCard.findAll({
      where: { id: { [Op.in]: receiveCards } },
      attributes: ['id', 'category_id', 'search_param', 'trading_card_estimated_value'],
      include: [
        {
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }
      ]
    });

    const sendProducts = await TradingCard.findAll({
      where: { id: { [Op.in]: sendCards } },
      attributes: ['id', 'category_id', 'search_param', 'trading_card_estimated_value'],
      include: [
        {
          model: Category,
          as: 'parentCategory',
          attributes: ['id', 'sport_name']
        }
      ]
    });

    // Get shipments
    const shipments = await Shipment.findAll({
      where: { trade_id: Array.isArray(trade_id) ? trade_id[0] : trade_id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'profile_picture']
        }
      ]
    });

    // Determine trading partner
    const tradingPartner = tradeProposal.trade_sent_by === userId 
      ? (tradeProposal as any).tradeReceiver 
      : (tradeProposal as any).tradeSender;

    // Calculate cash amounts and determine who pays
    const isPaid = tradeProposal.trade_amount_paid_on != null;
    const isSender = userId === tradeProposal.trade_sent_by;
    const isReceiver = userId === tradeProposal.trade_sent_to;

    let cashInfo: any = {};
    let askForCashFlag = false;

    if (tradeProposal.trade_status === 'counter_accepted') {
      if (tradeProposal.ask_cash && tradeProposal.ask_cash > 0) {
        if (isPaid) {
          if (isSender) {
            cashInfo.ask_cash = { label: 'Amount you got', amount: tradeProposal.ask_cash };
          } else {
            cashInfo.ask_cash = { label: 'Amount you paid', amount: tradeProposal.ask_cash };
            askForCashFlag = true;
          }
        } else {
          if (isSender) {
            cashInfo.ask_cash = { label: 'Amount you get', amount: tradeProposal.ask_cash };
          } else {
            cashInfo.ask_cash = { label: 'Amount you pay', amount: tradeProposal.ask_cash };
            askForCashFlag = true;
          }
        }
      }

      if (tradeProposal.add_cash && tradeProposal.add_cash > 0) {
        if (isPaid) {
          if (isSender) {
            cashInfo.add_cash = { label: 'Amount you paid', amount: tradeProposal.add_cash };
            askForCashFlag = true;
          } else {
            cashInfo.add_cash = { label: 'Amount you got', amount: tradeProposal.add_cash };
          }
        } else {
          if (isSender) {
            cashInfo.add_cash = { label: 'Amount you pay', amount: tradeProposal.add_cash };
            askForCashFlag = true;
          } else {
            cashInfo.add_cash = { label: 'Amount you get', amount: tradeProposal.add_cash };
          }
        }
      }
    } else {
      // Same logic for regular trades
      if (tradeProposal.ask_cash && tradeProposal.ask_cash > 0) {
        if (isPaid) {
          if (isSender) {
            cashInfo.ask_cash = { label: 'Amount you got', amount: tradeProposal.ask_cash };
          } else {
            cashInfo.ask_cash = { label: 'Amount you paid', amount: tradeProposal.ask_cash };
            askForCashFlag = true;
          }
        } else {
          if (isSender) {
            cashInfo.ask_cash = { label: 'Amount you get', amount: tradeProposal.ask_cash };
          } else {
            cashInfo.ask_cash = { label: 'Amount you pay', amount: tradeProposal.ask_cash };
            askForCashFlag = true;
          }
        }
      }

      if (tradeProposal.add_cash && tradeProposal.add_cash > 0) {
        if (isPaid) {
          if (isSender) {
            cashInfo.add_cash = { label: 'Amount you paid', amount: tradeProposal.add_cash };
            askForCashFlag = true;
          } else {
            cashInfo.add_cash = { label: 'Amount you got', amount: tradeProposal.add_cash };
          }
        } else {
          if (isSender) {
            cashInfo.add_cash = { label: 'Amount you pay', amount: tradeProposal.add_cash };
            askForCashFlag = true;
          } else {
            cashInfo.add_cash = { label: 'Amount you get', amount: tradeProposal.add_cash };
          }
        }
      }
    }

    // Check if trade can be completed
    let canCompleteTrade = false;
    let markedAsCompleted = false;

    if (tradeProposal.trade_sender_confrimation === '1' && tradeProposal.receiver_confirmation === '1') {
      markedAsCompleted = true;
    } else if (tradeProposal.trade_sender_confrimation === '1' || tradeProposal.receiver_confirmation === '1') {
      markedAsCompleted = true;
    }

    // Check if both parties have shipped
    const userShipment = shipments.find(s => s.user_id === userId);
    const partnerShipment = shipments.find(s => s.user_id !== userId);
    
    if (userShipment?.tracking_id && partnerShipment?.tracking_id && tradeProposal.trade_status !== 'complete') {
      canCompleteTrade = !markedAsCompleted;
    }

    // Determine available actions based on trade status and user role
    const actions = await determineTradeActions(tradeProposal, userId, shipments, askForCashFlag);

    const responseData = {
      trade_proposal: {
        id: tradeProposal.id,
        code: tradeProposal.code,
        trade_status: tradeProposal.trade_status,
        trade_sent_by: tradeProposal.trade_sent_by,
        trade_sent_to: tradeProposal.trade_sent_to,
        message: tradeProposal.message,
        counter_personalized_message: tradeProposal.counter_personalized_message,
        trade_amount_paid_on: tradeProposal.trade_amount_paid_on,
        is_payment_received: tradeProposal.is_payment_received,
        trade_sender_confrimation: tradeProposal.trade_sender_confrimation,
        receiver_confirmation: tradeProposal.receiver_confirmation,
        accepted_on: tradeProposal.accepted_on,
        created_at: tradeProposal.created_at
      },
      trading_partner: {
        id: tradingPartner?.id,
        username: tradingPartner?.username,
        profile_picture: tradingPartner?.profile_picture
      },
      your_products: receivedProducts.map(product => ({
        id: product.id,
        search_param: product.search_param,
        estimated_value: product.trading_card_estimated_value,
        category: product.parentCategory?.sport_name
      })),
      their_products: sendProducts.map(product => ({
        id: product.id,
        search_param: product.search_param,
        estimated_value: product.trading_card_estimated_value,
        category: product.parentCategory?.sport_name
      })),
      cash_info: cashInfo,
      payment_status: {
        is_paid: isPaid,
        paid_on: tradeProposal.trade_amount_paid_on,
        ask_for_cash_flag: askForCashFlag
      },
      shipments: shipments.map(shipment => ({
        id: shipment.id,
        user_id: shipment.user_id,
        tracking_id: shipment.tracking_id,
        shipment_status: shipment.shipment_status,
        payment_id: shipment.paymentId,
        selected_rate: shipment.selected_rate,
        shipment_payment_status: shipment.shipment_payment_status,
        user: {
          id: (shipment as any).user?.id,
          username: (shipment as any).user?.username,
          profile_picture: (shipment as any).user?.profile_picture
        }
      })),
      completion_status: {
        can_complete_trade: canCompleteTrade,
        marked_as_completed: markedAsCompleted,
        sender_confirmed: tradeProposal.trade_sender_confrimation === '1',
        receiver_confirmed: tradeProposal.receiver_confirmation === '1'
      },
      available_actions: actions
    };

    return sendApiResponse(res, 200, true, "Trade detail retrieved successfully", responseData);

  } catch (error: any) {
    console.error('Get trade detail error:', error);
    return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
  }
};

// Helper function to determine available actions
const determineTradeActions = async (tradeProposal: any, userId: number, shipments: any[], askForCashFlag: boolean) => {
  const actions: any[] = [];
  const isSender = userId === tradeProposal.trade_sent_by;
  const isReceiver = userId === tradeProposal.trade_sent_to;

  // Get user shipments
  const userShipment = shipments.find(s => s.user_id === userId);
  const partnerShipment = shipments.find(s => s.user_id !== userId);

  switch (tradeProposal.trade_status) {
    case 'new':
      if (isReceiver) {
        actions.push({
          type: 'review',
          label: 'Review Trade',
          url: `/review-trade-proposal/${tradeProposal.id}`,
          icon: 'fa-search'
        });

        if (tradeProposal.ask_cash > 0) {
          actions.push({
            type: 'accept_and_pay',
            label: 'Accept & Pay',
            amount: tradeProposal.ask_cash,
            icon: 'fa-check'
          });
        } else {
          actions.push({
            type: 'accept',
            label: 'Accept Trade',
            icon: 'fa-check'
          });
        }

        actions.push({
          type: 'decline',
          label: 'Decline Trade',
          icon: 'fa-ban'
        });

        actions.push({
          type: 'counter',
          label: 'Counter Trade',
          url: `/counter-trade-proposal/${tradeProposal.id}`,
          icon: 'fa-dollar'
        });
      }
      break;

    case 'counter_offer':
      if (isSender) {
        if (tradeProposal.add_cash > 0) {
          actions.push({
            type: 'accept_counter_and_pay',
            label: 'Accept Counter Offer',
            amount: tradeProposal.add_cash,
            icon: 'ri-checkbox-circle-line'
          });
        } else {
          actions.push({
            type: 'accept_counter',
            label: 'Accept Counter Offer',
            icon: 'ri-checkbox-circle-line'
          });
        }

        actions.push({
          type: 'decline_counter',
          label: 'Decline Counter Offer',
          icon: 'fa-ban'
        });
      } else {
        actions.push({
          type: 'cancel_counter',
          label: 'Cancel Offer',
          icon: 'fa-ban'
        });
      }
      break;

    case 'accepted':
    case 'counter_accepted':
      // Check if payment is needed
      if (tradeProposal.trade_status === 'counter_accepted' && tradeProposal.ask_cash > 0 && !tradeProposal.trade_amount_paid_on) {
        if (isReceiver) {
          actions.push({
            type: 'pay_to_continue',
            label: 'Pay to Continue Trade',
            amount: tradeProposal.ask_cash,
            icon: 'ri-checkbox-circle-line'
          });
        }
      } else if (tradeProposal.trade_status === 'accepted' && tradeProposal.add_cash > 0 && !tradeProposal.trade_amount_paid_on) {
        if (isSender) {
          actions.push({
            type: 'pay_to_continue',
            label: 'Pay to Continue Trade',
            amount: tradeProposal.add_cash,
            icon: 'ri-checkbox-circle-line'
          });
        }
      }

      // Check if user needs to ship
      if (!userShipment || !userShipment.tracking_id) {
        if ((!askForCashFlag && tradeProposal.is_payment_received === 1) || (tradeProposal.ask_cash === 0 && tradeProposal.add_cash === 0)) {
          actions.push({
            type: 'ship_products',
            label: 'Ship Product(s)',
            url: '/trade/shipping-address',
            icon: 'fa-truck-fast'
          });
        }
      }

      // Check if both have shipped and can complete
      if (userShipment?.tracking_id && partnerShipment?.tracking_id) {
        const senderConfirmed = tradeProposal.trade_sender_confrimation === '1';
        const receiverConfirmed = tradeProposal.receiver_confirmation === '1';

        if (!senderConfirmed && !receiverConfirmed) {
          actions.push({
            type: 'complete_trade',
            label: 'Complete Trade',
            icon: 'complete_trade_proposal_check'
          });
        } else if (senderConfirmed && receiverConfirmed) {
          actions.push({
            type: 'trade_completed',
            label: 'Trade Marked Completed',
            icon: 'fa-check-double',
            disabled: true
          });
        } else {
          actions.push({
            type: 'waiting_confirmation',
            label: 'Waiting for Other Party Confirmation',
            icon: 'ri-eye-line'
          });
        }
      }
      break;

    case 'complete':
      if (tradeProposal.trade_sender_confrimation === '1' && tradeProposal.receiver_confirmation === '1') {
        actions.push({
          type: 'trade_completed',
          label: 'Trade Marked Completed',
          icon: 'fa-check-double',
          disabled: true
        });
      } else {
        actions.push({
          type: 'waiting_confirmation',
          label: 'Waiting for Other Party Confirmation',
          icon: 'ri-eye-line'
        });
      }
      break;

    case 'cancel':
    case 'declined':
      actions.push({
        type: 'trade_cancelled',
        label: tradeProposal.trade_status === 'cancel' ? 'This trade was cancelled' : 'This trade was declined',
        disabled: true
      });
      break;

    default:
      if (isSender) {
        actions.push({
          type: 'edit_trade',
          label: 'Edit Trade',
          url: `/edit-trade-proposal/${tradeProposal.id}`,
          icon: 'ri-edit-line'
        });

        actions.push({
          type: 'cancel_trade',
          label: 'Cancel Trade',
          icon: 'fa-ban'
        });
      }
      break;
  }

  return actions;
};
