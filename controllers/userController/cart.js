const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const mongoose = require("mongoose");
const HttpStatus = require('../../httpStatus');
const productOffer = require("../../model/proOfferSchema");




const addToCart = async (req, res) => {
  try {
    let userData = req.session.user;
    if (!userData) {
      console.log("User data not found...");
      return res
        .status(HttpStatus.Unauthorized)
        .json({ success: false, message: "Login Required" });
    }

    const data = req.body;
    console.log("Request Body:", data);
    const quantity = parseInt(req.body.quantity, 10);
    console.log("Quantity:", quantity);

    if (!data.prodId) {
      return res
        .status(HttpStatus.BadRequest)
        .json({ success: false, message: "Invalid product ID" });
    }

    if (quantity <= 0) {
      return res.json({
        success: false,
        message: "Quantity cannot be Zero or Negative!!!",
      });
    }

    const productToLookup = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(data.prodId) } }, 
      {
        $lookup: {
          from: "productoffers", 
          localField: "_id", 
          foreignField: "productId", 
          as: "productOffer", 
        },
      },
      {
        $unwind: {
          path: "$productOffer", 
          preserveNullAndEmptyArrays: true, 
        },
      },
    ]);

    if (!productToLookup || productToLookup.length === 0) {
      return res.status(HttpStatus.NotFound).json({ success: false, message: "Product not found" });
    }

    let productToCart = productToLookup[0];
    console.log("Product Data:", productToCart);

    const priceToUse = productToCart.productOffer?.discountPrice || productToCart.price;
    console.log("priceToUse => ", priceToUse);

    const ProductExist = await Cart.find({
      userId: userData._id,
      product_Id: data.prodId,
    }).lean();

    console.log("Product Exist in Cart:", ProductExist);

    if (ProductExist.length > 0) {
      return res.json({
        success: false,
        message: "Product already exists in cart",
      });
    }

    const cartData = await Cart.findOneAndUpdate(
      {
        userId: userData._id,
        product_Id: data.prodId,
      },
      {
        quantity: quantity,
        price: priceToUse,
        value: priceToUse * quantity,
      },
      { new: true, upsert: true }
    );

    console.log("Cart Data:.........>", cartData);

    if (cartData) {
      res.json({
        success: true,
        message: "Product added to cart",
        cartItem: cartData,
      });
    } else {
      res.status(HttpStatus.InternalServerError).json({ success: false, message: "Failed to add product to cart" });
    }
  } catch (error) {
    console.log("Error:", error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const loadCartPage = async (req, res) => {
  try {
    let userData = req.session.user;
    const ID = new mongoose.Types.ObjectId(userData._id);

    let cartProd = await Cart.aggregate([
      {
        $match: {
          userId: ID,
        },
      },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",
          localField: "product_Id",
          as: "productData",
        },
      },
      {
        $unwind: {
          path: "$productData",
          preserveNullAndEmptyArrays: true, 
        },
      },
      {
        $lookup: {
          from: "productoffers", 
          localField: "productData._id",
          foreignField: "productId",
          as: "productOffer",
        },
      },
      {
        $unwind: {
          path: "$productOffer",
          preserveNullAndEmptyArrays: true, 
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          quantity: 1,
          value: 1,
          productName: "$productData.name",
          productPrice: {
            $cond: {
              if: { $gt: [{ $ifNull: ["$productOffer.discountPrice", 0] }, 0] }, 
              then: "$productOffer.discountPrice", 
              else: "$productData.price", 
            },
          },
          productDescription: "$productData.description",
          productImage: "$productData.imageUrl",
          stock: "$productData.stock",
        },
      },
    ]);

    console.log('product in cart______', cartProd)
    
    cartProd = cartProd.map(item => {
      if (item.stock <= 0) {
        item.outOfStock = true; 
      }
      return item;
    });

    const subTotal = await Cart.aggregate([
      {
        $match: {
          userId: ID,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$value" },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
        },
      },
    ]);
    console.log(subTotal, "SUBTOTAL");

    console.log(cartProd);
    if (cartProd.length > 0) {
      res.render("user/cart", {
        userData,
        cartProd,
        subTotal: subTotal[0].total,
      });
    } else {
      res.render("user/emptyCart", { userData });
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



const removeFromCart = async (req, res) => {
  try {
    const userData = req.session.user;
    const { id } = req.body;
    const removeCartItem = await Cart.findByIdAndDelete({ _id: id });
    if (removeCartItem) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};




const updateCart = async (req, res) => {
  try {
    const userData = req.session.user;
    const ID = new mongoose.Types.ObjectId(userData._id);
    const { cartIdForUpdate, newValue } = req.body;

    // fetch the cart item
    const oldCart = await Cart.findOne({ _id: cartIdForUpdate });
    console.log(cartIdForUpdate, oldCart);

    const product = await Product.findOne({ _id: oldCart.product_Id }, { price: 1, stock: 1 }).lean();

    const latestPrice = product.price;
    const latestStock = product.stock;

    const existingOffer = await productOffer.findOne({
      productId: product._id,
      currentStatus: true,  
    });

    const finalPrice = existingOffer && existingOffer.discountPrice > 0 
      ? existingOffer.discountPrice : latestPrice;

    
    if (newValue > latestStock) {
      return res.json({
        success: false,
        message: "Product stock limit reached!",
      });
    }

    // allowed maximum 4 units per user
    if (newValue > 4) {
      return res.json({
        success: false,
        message: "You can only choose up to 4 units of this product.",
      });
    }

    

    
      const updatedValue = newValue * finalPrice;
      console.log(cartIdForUpdate, updatedValue);

    const updatedcartvalue = await Cart.updateOne(
      { _id: cartIdForUpdate },
      { $set: { quantity: newValue, value: updatedValue } }
    );
    console.log(updatedcartvalue);

    
    const updatedCart = await Cart.find({
      _id: cartIdForUpdate,
    }).lean();

    
    const subTotal = await Cart.aggregate([
      {
        $match: {
          userId: ID,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$value" },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
        },
      },
    ]);
    console.log(subTotal, "SUBTOTAL");

    
    const newData = [];

    updatedCart.forEach((data) => {
      const newDataItem = { ...data };
      
      if (latestStock <= 0 && newValue>latestStock) {
    newDataItem.totalAmount = "Out of Stock";  
    newDataItem.outOfStock = true; 
  } else {
    newDataItem.totalAmount = updatedValue;
    newDataItem.totalAmount = updatedValue;
  }
      newDataItem.currentStock = latestStock;
      newData.push(newDataItem);
    });
    console.log(newData, "itemsitemssss");

    const cartValue = newData.reduce((acc, item) => acc + item.totalAmount, 0);
    console.log(cartValue);
    res.json({
      success: true,
      message: "Cart Updated",
      cartProd: newData,
      items: newData,
      cartValue: subTotal,
    });

    console.log(newData[0].totalAmount);
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};





const checkOutOfStock = async (req, res) => {
  try {
    const userData = req.session.user;
    const cartItems = await Cart.find({ userId: userData._id }).lean(); 

    if (cartItems.length === 0) {
      return res.json({ success: false, message: "Your cart is empty." });
    }

    let outOfStockProducts = [];
    let invalidQuantities = [];

    for (let item of cartItems) {
      const product = await Product.findById(item.product_Id).lean();
      if (item.quantity > product.stock) {
      if (product.stock <= 0) {        
        outOfStockProducts.push(product.name);
      }else {
        invalidQuantities.push({
          productName: product.name,
          requestedQuantity: item.quantity,
          availableStock: product.stock,
        });
      }
    }
    }

    if (outOfStockProducts.length > 0) {      
      return res.json({
        success: false,
        message: `${outOfStockProducts.join(", ")} product out of stock. Please remove it before checkout.`,
      });
    }

    if (invalidQuantities.length > 0) {
      const quantityMessages = invalidQuantities.map(item => {
        return `${item.productName} available only ${item.availableStock}`;
      });

      return res.json({
        success: false,
        message: `${quantityMessages.join("; ")}. Please update the quantity.`,
      });
    }
    
    res.json({
      success: true,
      message: "All products are in stock. You can proceed to checkout.",
    });
  

  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};



module.exports = {
  loadCartPage,
  addToCart,
  removeFromCart,
  updateCart,
  checkOutOfStock
};
