const express = require("express")
const router = express.Router()
const { logedout, logedin, isBlocked } = require('../middleware/usersAuth')
const { getHome, getLogin, getSignup, doSignup, getOtp, submitOtp, resendOtp, doLogin, doLogout , googleCallback, productDetails } = require("../controllers/userController/userController")
const { submitMail, submitMailPost, forgotOtppage, forgotOtpSubmit, resetPasswordPage, resetPassword } = require('../controllers/userController/forgotPassword')
const { viewUserProfile, EditUserProfile, updateUserProfile, changePassword, updatePassword, my_Orders, orderDetails, verify, retryPayment } = require('../controllers/userController/profile')
const { addAddress, addAddressPost, manageAddress, editAddress, editAddressPost, deleteAddress } = require('../controllers/userController/addressManagement')
const { loadCartPage, addToCart, removeFromCart, updateCart, checkOutOfStock } = require('../controllers/userController/cart')
const { loadCheckoutPage, placeorder, orderSuccess} = require('../controllers/userController/checkoutManagement')
const { getProduct, searchAndSort } = require('../controllers/userController/shopManagement')


const { payment_failed, cancelOrder,returnOrder, cancelOneProduct , returnOneProduct }= require('../controllers/userController/orderManagement')
require('../middleware/googleAuth')
const passport = require('passport');
const store = require("../middleware/multer")


// Google authentication

router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), googleCallback)


// Get Home Page

router.get("/", getHome)


// Login & Logout

router.get("/login", logedout, getLogin)
router.post('/login', doLogin)
router.get('/logout', doLogout)


// Signup

router.get("/signup", logedout, getSignup)
router.post('/signup', logedout, doSignup)


// Submit Otp & Resend Otp

router.get('/submit_otp', logedout, getOtp)
router.post('/submit_otp', logedout, submitOtp)
router.get('/resend_otp', logedout, resendOtp)


// Forgot Password

router.get('/forgotPassword', logedout, submitMail)
router.post('/forgotPassword', logedout, submitMailPost)
router.get('/otp', logedout, forgotOtppage)
router.post('/otp', forgotOtpSubmit)
router.get('/resetPassword', logedout, resetPasswordPage)
router.post('/resetPassword', resetPassword)


// Shop Page

router.get('/shop', getProduct)
router.post('/search',searchAndSort)


// Product Detail Page

router.get('/productDetails/:id', productDetails)


// User Profile Page

router.get('/profile', logedin, isBlocked, viewUserProfile)
router.get('/edit_profile', logedin, isBlocked, EditUserProfile)
router.post('/edit_profile/:id', logedin, isBlocked, store.single('image'), updateUserProfile)
router.get('/changePassword', logedin, isBlocked, changePassword)
router.post('/updatePassword', logedin, isBlocked, updatePassword)
router.get('/add_address', logedin, isBlocked, addAddress)
router.get('/addresses', logedin, isBlocked, manageAddress)
router.post('/add_address', logedin, isBlocked, addAddressPost)
router.get('/edit_address/:id', logedin, isBlocked, editAddress)
router.post('/edit_address/:id', logedin, isBlocked, editAddressPost)
router.get('/delete_address/:id', logedin, isBlocked, deleteAddress)


// Order Page

router.get('/myOrders', logedin, isBlocked, my_Orders)
router.get('/orderDetails/:id', logedin, isBlocked, orderDetails)

// Cart Page

router.get('/cart', logedin, isBlocked, loadCartPage)
router.post('/addtocart/:id', logedin, isBlocked, addToCart)
router.post('/removeFromCart', logedin, isBlocked, removeFromCart)
router.post('/updatecart', updateCart)
router.post('/checkOutOfStock', checkOutOfStock);



// Checkout Page

router.get('/cart/checkout', logedin, isBlocked, loadCheckoutPage)
router.post('/placeorder', placeorder)
router.get('/orderPlaced', logedin, isBlocked, orderSuccess)
router.get('/payment_failed', logedin , isBlocked , payment_failed)





router.put('/cancel-order/:id', cancelOrder);

router.put('/return-order/:id', returnOrder);

router.put('/cancel-one-product', cancelOneProduct);

router.put('/return-one-product', returnOneProduct);





module.exports = router