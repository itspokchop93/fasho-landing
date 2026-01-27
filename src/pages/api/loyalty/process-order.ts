import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';

/**
 * Process loyalty tokens for an order - handles both spending and earning
 * This is called after successful payment and order creation
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const {
      userId,
      orderId,
      orderNumber,
      orderTotal,       // Total amount of the order
      couponDiscount,   // Discount from coupon
      fashokensSpent,   // Tokens the user wants to spend
      fashokensDiscount // Dollar amount discount from tokens
    } = req.body;

    console.log('🪙 LOYALTY: Processing order tokens:', {
      userId,
      orderId,
      orderNumber,
      orderTotal,
      couponDiscount,
      fashokensSpent,
      fashokensDiscount
    });

    if (!userId) {
      console.log('🪙 LOYALTY: No userId provided, skipping loyalty processing');
      return res.status(200).json({ 
        success: true, 
        message: 'No user - guest checkout, skipping loyalty',
        fashokens_earned: 0,
        fashokens_spent: 0
      });
    }

    const supabase = createAdminClient();

    // Get loyalty settings
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!settings?.is_program_active) {
      console.log('🪙 LOYALTY: Program not active, skipping');
      return res.status(200).json({ 
        success: true, 
        message: 'Loyalty program not active',
        fashokens_earned: 0,
        fashokens_spent: 0
      });
    }

    const tokensPerDollar = settings.tokens_per_dollar || 100;
    const redemptionRate = settings.redemption_tokens_per_dollar || 100;

    let tokensSpent = 0;
    let tokensEarned = 0;
    let debitLedgerEntryId = null;
    let creditLedgerEntryId = null;

    // Step 1: If user applied tokens during checkout, debit them
    if (fashokensSpent && fashokensSpent > 0) {
      console.log('🪙 LOYALTY: Debiting', fashokensSpent, 'tokens');
      
      const { data: debitResult, error: debitError } = await supabase
        .rpc('debit_fashokens', {
          p_user_id: userId,
          p_amount: fashokensSpent,
          p_reason: `Redeemed on order #${orderNumber}`,
          p_order_id: orderId,
          p_order_total: orderTotal
        });

      if (debitError) {
        console.error('🪙 LOYALTY: Error debiting tokens:', debitError);
        // Don't fail the order, just log the error
      } else if (debitResult && debitResult[0]) {
        const result = debitResult[0];
        if (result.success) {
          tokensSpent = fashokensSpent;
          debitLedgerEntryId = result.ledger_entry_id;
          console.log('🪙 LOYALTY: Successfully debited', tokensSpent, 'tokens. New balance:', result.new_balance);
        } else {
          console.error('🪙 LOYALTY: Debit failed:', result.error_message);
        }
      }
    }

    // Step 2: Calculate actual amount paid (for earning tokens)
    // actual_paid = order_total - coupon_discount - fashoken_discount
    const actualPaid = orderTotal - (couponDiscount || 0) - (fashokensDiscount || 0);
    console.log('🪙 LOYALTY: Actual amount paid:', actualPaid);

    // Step 3: Calculate and credit earned tokens
    if (actualPaid > 0) {
      tokensEarned = Math.floor(actualPaid * tokensPerDollar);
      console.log('🪙 LOYALTY: Crediting', tokensEarned, 'tokens for $', actualPaid, 'paid');
      
      const { data: creditResult, error: creditError } = await supabase
        .rpc('credit_fashokens', {
          p_user_id: userId,
          p_amount: tokensEarned,
          p_reason: `Earned from order #${orderNumber}`,
          p_order_id: orderId,
          p_order_total: orderTotal
        });

      if (creditError) {
        console.error('🪙 LOYALTY: Error crediting tokens:', creditError);
        tokensEarned = 0;
      } else if (creditResult && creditResult[0]) {
        const result = creditResult[0];
        if (result.success) {
          creditLedgerEntryId = result.ledger_entry_id;
          console.log('🪙 LOYALTY: Successfully credited', tokensEarned, 'tokens. New balance:', result.new_balance);
        } else {
          console.error('🪙 LOYALTY: Credit failed:', result.error_message);
          tokensEarned = 0;
        }
      }
    }

    // Step 4: Update order record with fashokens data
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        fashokens_spent: tokensSpent,
        fashokens_earned: tokensEarned,
        fashokens_discount_amount: fashokensDiscount || 0
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('🪙 LOYALTY: Error updating order with fashokens:', updateError);
    } else {
      console.log('🪙 LOYALTY: Order updated with fashokens data');
    }

    // Get final balance for response
    const { data: account } = await supabase
      .from('loyalty_accounts')
      .select('balance')
      .eq('user_id', userId)
      .single();

    return res.status(200).json({
      success: true,
      fashokens_spent: tokensSpent,
      fashokens_earned: tokensEarned,
      fashokens_discount: fashokensDiscount || 0,
      new_balance: account?.balance || 0,
      debit_ledger_entry_id: debitLedgerEntryId,
      credit_ledger_entry_id: creditLedgerEntryId
    });

  } catch (error) {
    console.error('🪙 LOYALTY: Error processing order tokens:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      fashokens_earned: 0,
      fashokens_spent: 0
    });
  }
}
