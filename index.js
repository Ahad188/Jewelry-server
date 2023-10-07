const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express()
 
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

    //     JWT API
    app.post('/jwt', (req,res)=>{
     const user = req.body;
     const token = jwt.sign(user, process.env.Access_TOKEN, { expiresIn: '1h' })
     res.send({token})
})

     // get product
    app.get('/product',async (req,res)=>{
     const result = await productCollection.find().toArray();
     res.send(result)
    })
//     get reviews
    app.get('/reviews',async (req,res)=>{
     const result = await reviewsCollection.find().toArray();
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


app.delete('/card/:id', async (req, res) => {
     const id = req.params.id;
     
     const query = { _id: new ObjectId(id) };
     const result = await cartCollection.deleteOne(query);
      
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

 