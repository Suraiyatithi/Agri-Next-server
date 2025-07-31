const express=require('express');
const app=express();
const cors=require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const port=process.env.PORT||5000;


app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');

const user = encodeURIComponent(process.env.DB_USER);
const pass = encodeURIComponent(process.env.DB_PASS);
const uri = `mongodb+srv://${user}:${pass}@cluster0.2jwpece.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

 const paymentCollection = client.db("farmDb").collection("payments");
   const productCollection = client.db("farmDb").collection("product");
   const cartCollection = client.db("farmDb").collection("carts");
   const userCollection = client.db("farmDb").collection("users");
   const blogCollection = client.db("farmDb").collection("blog");
   const reviewCollection = client.db("farmDb").collection("reviews");



    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // users related api
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })




    app.get('/product', async(req, res) =>{
        const result = await productCollection.find().toArray();
        res.send(result);
    })

  app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await productCollection.findOne(query);
      res.send(result);
    })
//verifyToken,verifyAdmin,
    app.post('/product', async (req, res) => {
      const item = req.body;
      const result = await productCollection.insertOne(item);
      res.send(result);
    });


app.patch('/product/:id', async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  const updatedDoc = {
    $set: {
      productName: item.productName,
      category: item.category,
      price: item.price,
      availableQuantity: item.availableQuantity,
      productImage: item.productImage,
      rating: item.rating,
      description: item.description,
      authorName: item.authorName,
      authorEmail: item.authorEmail
    }
  };

  const result = await productCollection.updateOne(filter, updatedDoc);
  res.send(result);
});





    // app.patch('/product/:id', async (req, res) => {
    //   const item = req.body;
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) }
    //   const updatedDoc = {
    //     $set: {
    //       productName: item.productName,
    //       category: item.category,
    //       price: item.price,
    //       availableQuantity: item.availableQuantity,
    //       productImage: item.productImage
    //     }
    //   }

// "_id": "1",
//       "category": "Fertilizer",
//       "productName": "Organic Compost",
//       "authorName": "Alex Green",
//       "authorEmail": "alex@example.com",
//       "price": 15.99,
//       "rating": 4.5,
//       "productImage": "https://i.ibb.co.com/LDFHZbc9/download.jpg",
//       "description": "Natural compost for enriching soil health.",
//       "availableQuantity": 100


    //   const result = await menuCollection.updateOne(filter, updatedDoc)
    //   res.send(result);
    // })

    app.delete('/product/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await productCollection.deleteOne(query);
      res.send(result);
    })



app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    // app.delete('/carts/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await cartCollection.deleteOne(query);
    //   res.send(result);
    // })
   

app.delete('/carts/:id', async (req, res) => {
  const id = req.params.id;

  // Validate ID format
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ error: 'Invalid cart item ID' });
  }

  const query = { _id: new ObjectId(id) };

  try {
    const result = await cartCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Cart item not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error deleting cart item:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});


//blog

app.get('/blog', async (req, res) => {
  const blogs = await blogCollection.find().sort({ _id: -1 }).toArray();
  res.send(blogs);
});

// ➕ Add a new blog
app.post('/blog', async (req, res) => {
  const blog = { ...req.body, likes: 0, comments: [] };
  const result = await blogCollection.insertOne(blog);
  res.send(result);
});

// ❤️ Like a blog
app.patch('/blog/:id/like', async (req, res) => {
  const id = req.params.id;
  await blogCollection.updateOne(
    { _id: new ObjectId(id) },
    { $inc: { likes: 1 } }
  );
  const updated = await blogCollection.findOne({ _id: new ObjectId(id) });
  res.send(updated);
});

// 💬 Add a comment
app.patch('/blog/:id/comment', async (req, res) => {
  const id = req.params.id;
  const { commenterName, commentText } = req.body;

  const comment = {
    commenterName,
    commentText,
    timestamp: new Date(),
  };

  await blogCollection.updateOne(
    { _id: new ObjectId(id) },
    { $push: { comments: comment } }
  );

  const updated = await blogCollection.findOne({ _id: new ObjectId(id) });
  res.send(updated);
});




//payment 
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    })


    app.get('/payments', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await paymentCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch payments', error });
  }
});



//review section

// POST review
app.post('/reviews', async (req, res) => {
  const review = req.body;
  const result = await reviewCollection.insertOne(review);
  res.send(result);
});

// GET reviews
app.get('/reviews', async (req, res) => {
  const result = await reviewCollection.find().sort({ _id: -1 }).toArray();
  res.send(result);
});



  // stats or analytics
    app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const menuItems = await productCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // this is not the best way
      // const payments = await paymentCollection.find().toArray();
      // const revenue = payments.reduce((total, payment) => total + payment.price, 0);

      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        menuItems,
        orders,
        revenue
      })
    })


    // order status
    /**
     * ----------------------------
     *    NON-Efficient Way
     * ------------------------------
     * 1. load all the payments
     * 2. for every menuItemIds (which is an array), go find the item from menu collection
     * 3. for every item in the menu collection that you found from a payment entry (document)
    */

    // using aggregate pipeline
    app.get('/order-stats', verifyToken, verifyAdmin, async(req, res) =>{
      const result = await paymentCollection.aggregate([
        {
          $unwind: '$menuItemIds'
        },
        {
          $lookup: {
            from: 'product',
            localField: 'menuItemIds',
            foreignField: '_id',
            as: 'menuItems'
          }
        },
        {
          $unwind: '$menuItems'
        },
        {
          $group: {
            _id: '$menuItems.category',
            quantity:{ $sum: 1 },
            revenue: { $sum: '$menuItems.price'} 
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            quantity:'$quantity',
            revenue: '$revenue'
          }
        }
      ]).toArray();

      res.send(result);

    })



    //seller role
    // GET role by email

    const sellerRequestsCollection = client.db("farmDb").collection("sellerRequests");

app.get('/users/role/:email', async (req, res) => {
    const email = req.params.email;
    const user = await userCollection.findOne({ email });
    if (!user) {
        return res.send({ role: 'user' }); // default fallback
    }
    res.send({ role: user.role }); // 'admin', 'seller', etc.
});

app.post('/seller-requests', async (req, res) => {
    const request = req.body; // { email, name, role: 'pending' }

    // Prevent duplicate requests
    const exists = await sellerRequestsCollection.findOne({ email: request.email });
    if (exists) {
        return res.status(400).send({ message: 'Request already sent' });
    }

    const result = await sellerRequestsCollection.insertOne(request);
    res.send(result);
});


// app.patch('/users/make-seller/:email', async (req, res) => {
//     const email = req.params.email;
//     const filter = { email };
//     const updateDoc = { $set: { role: 'seller' } };
//     const result = await usersCollection.updateOne(filter, updateDoc);
//     res.send(result);
// });
app.patch('/users/make-seller/:email', async (req, res) => {
    const email = req.params.email;
    console.log("Incoming make-seller request for:", email);
    
    try {
        const filter = { email };
        const updateDoc = { $set: { role: 'seller' } };
        const result = await userCollection.updateOne(filter, updateDoc);
        console.log("Update result:", result);
        res.send(result);
    } catch (error) {
        console.error("Error in /users/make-seller:", error);
        res.status(500).send({ message: "Internal Server Error", error });
    }
});


app.get('/seller-requests', async (req, res) => {
    const result = await sellerRequestsCollection.find().toArray();
    res.send(result);
});
app.delete('/seller-requests/:email', async (req, res) => {
    const email = req.params.email;
    const result = await sellerRequestsCollection.deleteOne({ email });
    res.send(result);
});








// app.get('/seller-requests', async (req, res) => {
//     const requests = await sellerRequestsCollection.find().toArray();
//     res.send(requests);
// });

// app.delete('/seller-requests/:email', async (req, res) => {
//     const email = req.params.email;
//     const result = await sellerRequestsCollection.deleteOne({ email });
//     res.send(result);
// });

// // PATCH user role to 'seller'
// app.patch('/users/make-seller/:email', async (req, res) => {
//     const email = req.params.email;

//     const filter = { email };
//     const updateDoc = {
//         $set: { role: 'seller' },
//     };

//     const result = await usersCollection.updateOne(filter, updateDoc);
//     res.send(result);
// });



// app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
//   const result = await paymentCollection.aggregate([
//     {
//       $addFields: {
//         menuItemIds: {
//           $map: {
//             input: '$menuItemIds',
//             as: 'id',
//             in: { $toObjectId: '$$id' } // cast to ObjectId
//           }
//         }
//       }
//     },
//     { $unwind: '$menuItemIds' },
//     {
//       $lookup: {
//         from: 'menu',
//         localField: 'menuItemIds',
//         foreignField: '_id',
//         as: 'menuItems'
//       }
//     },
//     { $unwind: '$menuItems' },
//     {
//       $group: {
//         _id: '$menuItems.category',
//         quantity: { $sum: 1 },
//         revenue: { $sum: '$menuItems.price' }
//       }
//     },
//     {
//       $project: {
//         _id: 0,
//         category: '$_id',
//         quantity: 1,
//         revenue: 1
//       }
//     }
//   ]).toArray();

//   res.send(result);
// });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/',(req,res)=>{
    res.send('farming starting')
})
app.listen(port,()=>{
    console.log(`farming on port ${port}`)
})
