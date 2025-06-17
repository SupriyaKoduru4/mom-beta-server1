const express = require('express');
const router = express.Router();

const {
  createOrder,
  getAllOrders,
  getOrderById,
  assignOrder,
  updateOrderStatus,
  updateOrderIsActive, 
   getOrderByUserId,
   orderByDeliveryBoyId,
   deleteOrdersByUserId,
   deleteAllOrders,
   acceptOrder,
   delivered,
   getActiveOrders,
   getOrderSummary,
    getOrdersGraph,
    getRevenue,
    getSales,
    getTotalOrders,
    getSummary,
    setPickup,
    getDeliveryBoyOrderHistory


} = require('../controllers/order.controllers');
const userAuth = require('../middlewares/userAuth');
const deliveryBoyAuth = require('../middlewares/deliveryBoyAuth');
const {getActiveOrdersByUser} = require('../controllers/ActiveOrderController')

router.post('/add-order', userAuth, createOrder);

router.get("/activeOrders",userAuth,getActiveOrders)
router.get('/allorders', getAllOrders);


router.get('/orderbyid/:id' , getOrderById);

router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/active', updateOrderIsActive);
router.delete('/delete-all-orders', deleteAllOrders);
router.get('/getorderuser', userAuth ,getOrderByUserId);
router.get('/getorderdeliveryboy/:_id',userAuth ,orderByDeliveryBoyId );
router.delete('/delete-orders-by-user/:userId', userAuth, deleteOrdersByUserId);
router.post('/orders/:orderId/accept',deliveryBoyAuth,acceptOrder);
router.put("/setPickup/:orderId", deliveryBoyAuth, setPickup)
router.get("/getOrderHistory" , deliveryBoyAuth, getDeliveryBoyOrderHistory);

router.post('/delivered/:orderId',delivered);

router.get('/rev', getRevenue);
router.get('/sales',getSales);
router.get('/summary', getOrderSummary);
router.get('/orders-graph', getOrdersGraph);


module.exports = router;
