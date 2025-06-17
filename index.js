const express = require("express")
const cors = require("cors")
const connectDb = require("./config/db")
const session = require("express-session")
const addressRoutes = require('./routes/addressRoutes')
const deliveryBoyRoutes = require('./routes/deliveryBoyRoutes')
require("dotenv").config() 
const orderRoutes = require("./routes/order.routes")
const medicineRoutes = require("./routes/medicineRoutes")
const DeliveryAssessment = require('./routes/DeliveryAssessmentRoutes')
const Earning = require('./routes/EarningRoutes')
const Active = require('./routes/ActiveRoutes')
const wishlist = require('./routes/wishlistRoutes')
const StoreAddress = require('./routes/storeAddressRoutes')
const fileUpload = require('express-fileupload');
const AdminRoutes = require("./routes/Admin.routes")

const port = process.env.PORT || 3001
const sec= process.env.JWT_SECRET
console.log(`this ${sec}`)

connectDb()
const app = express()
app.use(cors())
app.use(express.json())
app.use(fileUpload({
  useTempFiles:true,
 tempFileDir: "/tmp/",})
)

app.use(session({
    secret: 'medicine on minute',      // 🔑 used to sign the cookie
    resave: false,                        // 💤 don't save session if unmodified
    saveUninitialized: false,            // 🐣 don't create session until something is stored
    cookie: {
      maxAge: 1000 * 60 * 60,            // 1 hour
      secure: false,                     // ⚠️ true if using HTTPS
      httpOnly: true                     // 🔐 can't access cookie via JS
    }
}));

app.use("/api" , orderRoutes)
app.use("/api/user" , require("./routes/user.routes"))
app.use("/address", addressRoutes )
app.use("/delivery", deliveryBoyRoutes)
app.use("/api/donar", require("./routes/donar.routes"))
app.use("/api/report", require("./routes/report.routes"))
app.use("/", Earning)
app.use("/api", DeliveryAssessment)
app.use("/api/wisearninghlist", wishlist)
app.use("/storeAddress", StoreAddress)
app.use('/api/prescriptions' , require("./routes/prescriptionRoutes"))
app.use('/api/suggestions', require("./routes/suggestionRoutes"))
app.use('/api/medicines' , medicineRoutes)
app.use('/api/medicine', medicineRoutes);
app.use('/api', Active )
app.use("/api/admin" , AdminRoutes)

app.listen(port , ()=>{
    console.log(`app is listening at http://localhost:${port}`)
    console.log(`this${sec}`)
})