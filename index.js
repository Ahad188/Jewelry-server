const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express()
const stripe = require('stripe')(process.env.PAYMENT_KEY)
 
const port = process.env.PORT ||5000;

app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// verify jwt function
const verifyJWT = (req, res, next) => {
     const authorization = req.headers.authorization;
     // console.log(authorization);
     if (!authorization) {
       return res.status(401).send({ error: true, message: 'jwt not found access' });
     }
     // bearer token
     const token = authorization.split(' ')[1];
   
     jwt.verify(token, process.env.Access_TOKEN, (err, decoded) => {
       if (err) {
          console.log(err);

         return res.status(401).send({ error: true, message: 'unauthorized 20202 access' })
       }
       req.decoded = decoded;
       next();
     })
   }



const uri =`mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.ejfmzqt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const usersCollection = client.db('JewelryDB').collection('users')
    const productCollection = client.db('JewelryDB').collection('all-product')
    const reviewsCollection = client.db('JewelryDB').collection('reviews')
    const cartCollection = client.db('JewelryDB').collection('carts')
    const paymentCollection = client.db('JewelryDB').collection('payments')

    //     JWT API
    app.post('/jwt', (req,res)=>{
     const user = req.body;
     const token = jwt.sign(user, process.env.Access_TOKEN, { expiresIn: '1h' })
     res.send({token})
})

const verifyAdmin = async (req, res, next) => {
     const email = req.decoded.email;
     const query = { email: email }
     const user = await usersCollection.findOne(query);
     if (user?.role !== 'admin') {
     return res.status(403).send({ error: true, message: 'forbidden message' });
     }
     next();
}




     // get product
    app.get('/product',async (req,res)=>{
     const result = await productCollection.find().toArray();
     res.send(result)
    })
    app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
     const newItem = req.body;
     const result = await productCollection.insertOne(newItem)
     res.send(result);
   })



//     get reviews
    app.get('/reviews',async (req,res)=>{
     const result = await reviewsCollection.find().toArray();
     res.send(result)
    })



// users api
app.get('/users',verifyJWT,verifyAdmin, async(req, res)=>{
     const result = await usersCollection.find().toArray()
     res.send(result)
})


//     users api
app.post('/users', async(req,res)=>{
     const user = req.body;
     const query = {email : user.email}
     const existingUser = await usersCollection.findOne(query)
     if(existingUser){
          return res.send({message:"User already exists"})
     }
     const result = await usersCollection.insertOne(user)
     res.send(result);
})
app.get('/users/admin/:email', verifyJWT, async (req, res) => {
     const email = req.params.email;

     if (req.decoded.email !== email) {
     res.send({ admin: false })
     }

     const query = { email: email }
     const user = await usersCollection.findOne(query);
     const result = { admin: user?.role === 'admin' }
     res.send(result);
})


app.patch('/users/admin/:id', async (req,res)=>{
     const id = req.params.id;
     const filter = {_id : new ObjectId(id)}
     const updateDoc = {
          $set:{role : "admin"}
     }
     const result = await usersCollection.updateOne(filter,updateDoc)
     res.send(result)
 })

app.delete('/user/admin/:id', async(req,res)=>{
     const id = req.params.id;
     const filter = {_id : new ObjectId(id)}
     const result = await usersCollection.deleteOne(filter)
     res.send(result)
})


















app.get('/carts', verifyJWT,  async (req, res) => {
     const email = req.query.email;

     if (!email) {
       res.send([]);
     }
     const decodedEmail = req.decoded.email;
     if (email !== decodedEmail) {
     return res.status(403).send({ error: true, message: 'Forbidden access' })
     }

     const query = { email: email };
     const result = await cartCollection.find(query).toArray();
     res.send(result);
   });
// post cart
app.post('/carts', async (req,res)=>{
     const item = req.body;
     const result = await cartCollection.insertOne(item)
     res.send(result)
})


app.delete('/carts/:id', async (req, res) => {
     const id = req.params.id;
     
     const query = { _id: new ObjectId(id) };
     const result = await cartCollection.deleteOne(query);
      
     res.send(result);
   })
   // create payment intent
   app.post('/create-payment-intent',verifyJWT, async (req, res) => {
     const { price } = req.body;
     const amount = parseInt(price * 100);;
     const paymentIntent = await stripe.paymentIntents.create({
       amount: amount,
       currency: 'usd',
       payment_method_types: ['card']
     });

     res.send({
       clientSecret: paymentIntent.client_secret
     })
   })

   // payment related api
   app.post('/payments', async(req, res) =>{
     const payment = req.body;
     const insertResult = await paymentCollection.insertOne(payment);

     const query = {_id : {$in: payment.cartItems.map(id => new ObjectId(id))}}
     const delateResult = await cartCollection.deleteMany(query)

     console.log("result 343423",delateResult);
     res.send({ insertResult, delateResult});
   })
   app.get('/history',verifyJWT,  async(req,res)=>{
     const email = req.query.email;

     if (!email) {
       res.send([]);
     }
     const decodedEmail = req.decoded.email;
     if (email !== decodedEmail) {
     return res.status(403).send({ error: true, message: 'Forbidden access' })
     }

     const query = { email: email };
     const result = await paymentCollection.find(query).toArray();
     res.send(result);
   })
    

   app.delete('/history/:id',verifyJWT, async (req, res) => {
     const id = req.params.id;
     
     const query = { _id: new ObjectId(id) };
     const result = await  paymentCollection.deleteOne(query);
      
     res.send(result);
   })










    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
//     await client.close();
  }
}
run().catch(console.dir);

















app.get('/',(req,res)=>{
     res.send("Jewelry shop open")
})

app.listen(port,()=>{
     console.log(`Jewelry shop port no :${port}`);
     
})

 