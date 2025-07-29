import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

// Define available packages (consistent with the main application)
const AVAILABLE_PACKAGES = [
  {
    id: "test-campaign",
    name: "TEST CAMPAIGN",
    price: 0.10,
    plays: "Test Package",
    placements: "Payment Testing Only",
    description: "For testing live payment processing"
  },
  {
    id: "legendary",
    name: "LEGENDARY",
    price: 479,
    plays: "125K - 150K Streams",
    placements: "375 - 400 Playlist Pitches",
    description: ""
  },
  {
    id: "unstoppable",
    name: "UNSTOPPABLE",
    price: 259,
    plays: "45K - 50K Streams",
    placements: "150 - 170 Playlist Pitches",
    description: ""
  },
  {
    id: "dominate",
    name: "DOMINATE",
    price: 149,
    plays: "18K - 20K Streams",
    placements: "60 - 70 Playlist Pitches",
    description: ""
  },
  {
    id: "momentum",
    name: "MOMENTUM",
    price: 79,
    plays: "7.5K - 8.5K Streams",
    placements: "25 - 30 Playlist Pitches",
    description: ""
  },
  {
    id: "breakthrough",
    name: "BREAKTHROUGH",
    price: 39,
    plays: "3K - 3.5K Streams",
    placements: "10 - 12 Playlist Pitches",
    description: ""
  }
];

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemId, packageId } = req.body;

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  if (!packageId || typeof packageId !== 'string') {
    return res.status(400).json({ error: 'Package ID is required' });
  }

  const supabase = createAdminClient();

  try {
    console.log(`🎵 UPDATE-ITEM-PACKAGE: Updating item ${itemId} to package ${packageId}`);

    // Find the selected package
    const selectedPackage = AVAILABLE_PACKAGES.find(pkg => pkg.id === packageId);
    if (!selectedPackage) {
      return res.status(400).json({ error: 'Invalid package selected' });
    }

    // Get the current order item
    const { data: currentItem, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !currentItem) {
      console.error('🎵 UPDATE-ITEM-PACKAGE: Item not found:', itemError);
      return res.status(404).json({ error: 'Order item not found' });
    }

    // Get the current order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', currentItem.order_id)
      .single();

    if (orderError || !order) {
      console.error('🎵 UPDATE-ITEM-PACKAGE: Order not found:', orderError);
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldPrice = currentItem.discounted_price;
    const newPrice = selectedPackage.price;
    const priceDifference = newPrice - oldPrice;

    console.log(`🎵 UPDATE-ITEM-PACKAGE: Price change: ${oldPrice} -> ${newPrice} (difference: ${priceDifference})`);

    // Update the order item with new package information
    const { data: updatedItem, error: updateError } = await supabase
      .from('order_items')
      .update({
        package_id: selectedPackage.id,
        package_name: selectedPackage.name,
        package_price: selectedPackage.price,
        package_plays: selectedPackage.plays,
        package_placements: selectedPackage.placements,
        package_description: selectedPackage.description,
        original_price: selectedPackage.price,
        discounted_price: selectedPackage.price,
        is_discounted: false, // Reset discount status when package changes
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select('*')
      .single();

    if (updateError) {
      console.error('🎵 UPDATE-ITEM-PACKAGE: Error updating order item:', updateError);
      return res.status(500).json({ error: 'Failed to update order item package' });
    }

    console.log(`🎵 UPDATE-ITEM-PACKAGE: Successfully updated item ${itemId} package to ${selectedPackage.name}`);

    // Update order totals
    const newSubtotal = order.subtotal + priceDifference;
    const newTotal = order.total + priceDifference;

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        subtotal: newSubtotal,
        total: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateOrderError) {
      console.error('🎵 UPDATE-ITEM-PACKAGE: Error updating order totals:', updateOrderError);
      // Don't fail the request, item was updated successfully
    } else {
      console.log(`🎵 UPDATE-ITEM-PACKAGE: Updated order totals - subtotal: ${newSubtotal}, total: ${newTotal}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Package updated successfully',
      item: updatedItem,
      packageInfo: {
        name: selectedPackage.name,
        price: selectedPackage.price,
        plays: selectedPackage.plays,
        placements: selectedPackage.placements
      },
      orderTotals: {
        subtotal: newSubtotal,
        total: newTotal,
        priceDifference: priceDifference
      }
    });

  } catch (error) {
    console.error('🎵 UPDATE-ITEM-PACKAGE: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler); 