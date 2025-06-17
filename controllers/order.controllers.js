const Order = require('../models/order.models');
const DeliveryBoy = require('../models/DeliveryBoy');
const Earning = require('../models/Earning');
const DeliveryAssessment = require('../models/DeliveryAssessment');
const Medicine = require('../models/medicines/Productdetail.model.');
const User=require('../models/user.models');
const DeliverBoy=require('../models/DeliveryBoy')
const moment = require('moment');
const mongoose = require('mongoose');

// Create Order
function generateOrderIdFromObjectId(objectId) {
  const hex = objectId.toString().slice(-8);     
  const decimal = parseInt(hex, 16);             
  return decimal.toString().padStart(8, '0');     
}
exports.createOrder = async (req, res) => {
  const user_id = req.userId;

  const {
    address_id,
    ETA = 10,
    medicines,
    subtotal,
    shippingFee = 0,
    tax = 0,
    discount = 0,
    total_amount,
    paymentMethod = 'COD',
    isActive = true,
  } = req.body;

  if (!address_id || !Array.isArray(medicines) || medicines.length === 0 || !subtotal || !total_amount) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields or invalid medicines list.',
    });
  }

  try {
    const tempId = new mongoose.Types.ObjectId();
    const orderId = generateOrderIdFromObjectId(tempId);

    const newOrder = new Order({
      _id: tempId,
      user_id,
      address_id,
      ETA,
      medicines,
      subtotal,
      shippingFee,
      tax,
      discount,
      total_amount,
      paymentMethod,
      isActive,
      orderId,
      status: 'confirmed',
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: newOrder,
    });

  } catch (err) {
    console.error("Order creation error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
exports.getActiveOrders = async (req , res)=>{
  const userId = req.userId
  try{
    const ActiveOrders = await Order.find({user_id:userId , isActive:true})
    res.status(200).send({data:ActiveOrders,
      count: ActiveOrders.length
    })
  }catch(e){
    res.status(500).send({msg:"Internal server error" , e})
  }
}


// Manually assign delivery boy to an order

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user_id')
      .populate('address_id')
      .populate('deliveryboy_id');

    res.status(200).json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
  // const userId = req.userId
  try {
    const order = await Order.findById({ _id: req.params.id })
      .populate('user_id')
      .populate('address_id')
      .populate('deliveryboy_id');


    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.orderByDeliveryBoyId = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoyId;

    if (!mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
      return res.status(400).json({ success: false, message: "Invalid delivery boy ID" });
    }

    const orders = await Order.find({ deliveryboy_id: deliveryBoyId })
      .populate('user_id')
      .populate('address_id');

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, orders });

  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDeliveryBoyOrderHistory = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoyId;

    if (!mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
      return res.status(400).json({ success: false, message: 'Invalid Delivery Boy ID' });
    }

    const orders = await Order.find({
      deliveryboy_id: deliveryBoyId,
      status: 'delivered'
    })
      .populate('user_id')
      .populate('address_id')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (err) {
    console.error("Error fetching delivery boy order history:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};





exports.getOrderByUserId = async (req, res) => {
  try {
    const userId = req.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID' });
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const orders = await Order.find({ user_id: userObjectId })
      .populate({
        path: 'medicines.medicine_id',
        select: 'imageUrl medicine_name '
      })
      .populate('user_id')
      .populate('address_id')
      .populate('deliveryboy_id')
    

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this user with assigned delivery boy and address',
      });
    }

    res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};



// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('deliveryboy_id');


    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status;
    await order.save();

    if (status === 'delivered') {
      await updateEarnings(order);
      if (order.deliveryboy_id) {
        order.deliveryboy_id.isAvailable = 'yes';
        await order.deliveryboy_id.save();
      }
    }

    res.status(200).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update order isActive flag
exports.updateOrderIsActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.isActive = isActive;
    await order.save();

    res.status(200).json({
      success: true,
      message:` Order isActive updated to ${isActive}`,
      order,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.updateOrderLocation = async (req, res) => {
  const { orderId } = req.params;
  const { latitude, longitude } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.currentLocation = { latitude, longitude };
    await order.save();

    return res.status(200).json({ success: true, message: 'Location updated', order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteOrdersByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await Order.deleteMany({ user_id: userId });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} order(s) deleted successfully for user ID: ${userId}`,
    });
  } catch (err) {
    console.error('Error deleting user orders:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.deleteAllOrders = async (req, res) => {
  try {
    const result = await Order.deleteMany({});
    return res.status(200).json({
      success: true,
      message:` ${result.deletedCount} order(s) deleted successfully.`,
    });
  } catch (err) {
    console.error('Error deleting all orders:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.acceptOrder = async (req, res) => {
  const { orderId } = req.params;
  const deliveryBoyId = req.deliveryBoyId;

  try {

    const deliveryBoy = await DeliveryBoy.findOne({ _id: deliveryBoyId, status: 'Online' });
    if (!deliveryBoy) {
      return res.status(403).json({ message: 'You must be online to accept orders' });
    }
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        deliveryboy_id: null,
        status: 'confirmed'
      },
      {
        $set: {
          deliveryboy_id: deliveryBoyId,
          status: 'accepted'
        }
      },
      { new: true }
    );


    if (!order) {
      return res.status(400).json({ message: 'Order already accepted or not available' });
    }


  

    return res.status(200).json({
      message: 'Order accepted successfully',
      orderId: order._id,
      assignedTo: deliveryBoyId
    });
  } catch (error) {
    console.error("Error accepting order:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




exports.delivered = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId).populate('deliveryboy_id');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Order already marked as delivered' });
    }

   
    order.status = 'delivered';
    order.isActive = false
    await order.save();

    
    if (order.deliveryboy_id) {
      order.deliveryboy_id.status = 'Online';
      await order.deliveryboy_id.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Order marked as delivered',
      order,
    });

  } catch (err) {
    console.error('Error marking order as delivered:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
exports.setPickup = async (req, res) => {
  const { orderId } = req.params;
  const deliveryBoyId = req.deliveryBoyId;
  try {
    const order = await Order.findById(orderId).populate('deliveryboy_id');
    console.log(order)
    if(!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Order is not in accepted status' });
    }
    order.status = 'on the way';
    order.isActive = true; 
    // order.deliveryboy_id.status = 'On the way';
    await order.save();
    return res.status(200).json({msg:"order is pickedup"})
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
exports.getOrderSummary = async (req, res) => {
  try {
    const orders = await Order.find();

    const totalOrders = orders.length;
    const activeOrders = orders.filter(order => order.isActive).length;

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.total_amount || 0);
    }, 0);

    const averageRevenue = totalOrders > 0 ? totalRevenue / totalOrders : 0;


    const totalCustomers = await User.countDocuments();

    const totalDelivery =  orders.filter(order => order.status === "delivered").length;

    const totalDeliveryBoys = await DeliveryBoy.countDocuments();

    res.status(200).json({
      success: true,
      totalOrders,
      activeOrders,
      totalCustomers,
      totalDelivery,
      totalRevenue,
      averageRevenue,
      totalDeliveryBoys,
    });
  } catch (error) {
    console.error("Error in getOrderSummary:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


exports.getOrdersGraph = async (req, res) => {
  const { filter } = req.query;

  try {
    let groupFormat;
    let labelFormat;
    let startDate = moment().startOf('year');

    switch (filter) {
      case 'daily':
        startDate = moment().startOf('week');
        groupFormat = '%Y-%m-%d';
        labelFormat = 'ddd'; 
        break;
      case 'weekly':
        startDate = moment().subtract(1, 'month');
        groupFormat = '%Y-%U'; 
        labelFormat = 'Week W';
        break;
      case 'monthly':
        startDate = moment().startOf('year');
        groupFormat = '%Y-%m';
        labelFormat = 'MMM'; 
        break;
      case 'yearly':
      default:
        startDate = moment().subtract(5, 'years');
        groupFormat = '%Y';
        labelFormat = 'YYYY'; 
        break;
    }

    const orders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate.toDate() },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt',
            },
          },
          orders: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const formattedData = orders.map((entry) => ({
      label: formatLabel(entry._id, filter),
      orders: entry.orders,
    }));

    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

function formatLabel(dateStr, filter) {
  const date = moment(dateStr, filter === 'weekly' ? 'YYYY-ww' : undefined);
  switch (filter) {
    case 'daily':
      return moment(dateStr).format('ddd'); 
    case 'weekly':
      return `Week ${moment(dateStr, 'YYYY-ww').week()}`; 
    case 'monthly':
      return moment(dateStr).format('MMM'); 
    case 'yearly':
      return moment(dateStr).format('YYYY'); 
    default:
      return dateStr;
  }
}


exports.getRevenue = async (req, res) => {
  try {
    const now = new Date();
    const range = req.query.range || "all";
    let match = { status: "delivered" };
    let groupFormat;
    let labelFormatter;

    if (range === "this-month") {

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      match.createdAt = { $gte: startOfMonth, $lte: endOfMonth };

      groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      labelFormatter = (label) => {
        const date = new Date(label);
        return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      };
    } else {

      let oldestOrder = await Order.findOne({ status: "delivered" }).sort({ createdAt: 1 }).select("createdAt");
      const startDate = oldestOrder?.createdAt || new Date(now.getFullYear(), 0, 1);
      match.createdAt = { $gte: startDate, $lte: now };

      const diffYears = now.getFullYear() - startDate.getFullYear();
      if (diffYears <= 2) {
        groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        labelFormatter = (label) => {
          const [year, month] = label.split("-");
          return new Date(year, month - 1).toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          });
        };
      } else if (diffYears <= 5) {
        groupFormat = {
          $concat: [
            { $dateToString: { format: "%Y", date: "$createdAt" } },
            "-Q",
            {
              $toString: {
                $ceil: { $divide: [{ $month: "$createdAt" }, 3] },
              },
            },
          ],
        };
        labelFormatter = (label) => label;
      } else {
        groupFormat = { $dateToString: { format: "%Y", date: "$createdAt" } };
        labelFormatter = (label) => label;
      }
    }

    const revenueData = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupFormat,
          revenue: {
            $sum: {
              $subtract: ["$total_amount", { $ifNull: ["$discount", 0] }],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formatted = revenueData.map((entry) => ({
      label: labelFormatter(entry._id),
      revenue: entry.revenue,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


exports.getSales = async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const match = {
      createdAt: { $gte: startOfYear, $lte: endOfMonth },
      status: "delivered",
    };

    const salesData = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $month: "$createdAt" },
          sales: { $sum: 1 }, // count orders
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthlySales = Array.from({ length: now.getMonth() + 1 }, (_, i) => {
      const found = salesData.find((m) => m._id === i + 1);
      return {
        month: new Date(0, i).toLocaleString("en-US", { month: "short" }),
        sales: found ? found.sales : 0,
      };
    });

    res.status(200).json({ success: true, data: monthlySales });
  } catch (err) {
    console.error("Sales data error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//get revenue
// exports.getHI = async (req, res) => {
//   try {
//     const deliveredOrders = await Order.find({ status: 'delivered' });
//     let totalRevenue = 0;
//     deliveredOrders.forEach(order => {
//       if (order.total_earning !== undefined && order.total_earning !== null) {
//         totalRevenue += order.total_earning;
//       } else {
//         totalRevenue += (order.total_amount || 0) - (order.discount || 0);
//       }
//     });
//     res.status(200).json({ totalRevenue });
//   } catch (error) {
//     console.error('Error calculating total revenue:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };