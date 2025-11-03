const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3100;
const bodyParser = require('body-parser');
require('dotenv').config();
const { ObjectId, Timestamp } = require('mongodb');
const crypto = require('crypto');

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the Final Year Project Backend yea');
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const { Await } = require('react-router-dom');
const { timeStamp, count } = require('console');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.lsdr1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();

    const ProductCollection = client.db("EasyShopDB").collection("products");
    const CartCollection = client.db("EasyShopDB").collection("cart");
    const MessageCollection = client.db("EasyShopDB").collection("contactMessages");
    const WishlistCollection = client.db("EasyShopDB").collection("wishlist");
    const userCollection = client.db("EasyShopDB").collection("users");
    const userBehaviour = client.db("EasyShopDB").collection("userBehaviour");
    const orderCollection = client.db("EasyShopDB").collection("orders");

    app.get('/products', async (req, res) => {
      const products = await ProductCollection.find({}).toArray();
      res.send(products);

    })
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const product = await ProductCollection.findOne(query);
      res.send(product);
    });

    // ⁡⁢⁣⁣verify admin⁡
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden" });
      }
      next();
    }
    // ⁡⁢⁣⁣verify vendor⁡
    const verifyVendor = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isVendor = user.role === 'vendor';
      if (!isVendor) {
        return res.status(403).send({ message: "Forbidden" });
      }
      next();
    }

    app.get('/categories', async (req, res) => {
      const categories = await ProductCollection.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { category: "$_id", count: 1, _id: 0 } }
      ]).toArray();
      res.send(categories);
    })
    app.get('/products/:category', async (req, res) => {
      const category = decodeURIComponent(req.params.category).trim();
      console.log("Requested category:", category);

      try {
        // Case-insensitive match for category
        const products = await ProductCollection.find({
          category: { $regex: new RegExp(`^${category}$`, "i") }
        }).toArray();

        console.log("Number of products found:", products.length);

        res.json(products);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send({ error: "Server error" });
      }
    });
    // ⁡⁢⁣⁣Function to generate 24-char hex string⁡
    const generateId = () => {
      return crypto.randomBytes(12).toString("hex");
    }
    app.post('/products', async (req, res) => {
      try {
        const lastProduct = await ProductCollection.find().sort({ _id: -1 }).limit(1).toArray();
        let newId = 1;
        if (lastProduct.length && lastProduct[0].productId) {
          newId = parseInt(lastProduct[0].productId.replace(/p/i, "")) + 1;
        }
        const productData = {
          _id: generateId(),
          ...req.body,
          productId: `P${newId.toString().padStart(4, "0")}`,
          vendorEmail: req.body.vendorEmail,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        const result = await ProductCollection.insertOne(productData);
        res.status(201).json({ message: "Product added", productId: productData.productId });
      }
      catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ error: "Failed to add product" });
      }
    });



    // DELETE product by productId
    // pore fix korobo
    app.delete('/products/:productId', async (req, res) => {
      const productId = req.params.productId;
      console.log("Trying to delete product with productId:", productId);

      try {
        const result = await ProductCollection.deleteOne({ productId: productId });
        console.log("Delete result:", result);

        if (result.deletedCount === 1) {
          return res.status(200).json({ message: "Product deleted successfully" });
        } else {
          return res.status(404).json({ error: "Product not found" });
        }
      } catch (err) {
        console.error("Error deleting product:", err);
        res.status(500).json({ error: "Failed to delete product" });
      }
    });





    // ⁡⁢⁣⁣ search products by name⁡
    app.get('/products/search/:name', async (req, res) => {
      const searchQuery = decodeURIComponent(req.params.name).trim();
      const products = await ProductCollection.find({
        $or: [
          { productName: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      }).toArray();

      res.json(products);
    });
    //⁡⁢⁣⁣ gender based product filtering⁡
    app.get('/products/gender/:gender', async (req, res) => {
      const gender = req.params.gender;
      const products = await ProductCollection.find({

        targetGender: { $regex: new RegExp(`^${gender}$`, "i") }

      }).toArray();
      res.json(products);
    })
    app.post('/cart', async (req, res) => {
      const cartItem = req.body;
      const result = await CartCollection.insertOne(cartItem);
      res.json(result);
    })
    app.get('/cart', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }

      const cartItems = await CartCollection.find(query).toArray();
      res.json(cartItems);
    });
    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await CartCollection.deleteOne(query);
      res.json(result);
    });
    app.delete('/cart/clear', async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ message: 'Email required' });

        const result = await CartCollection.deleteMany({ email });
        res.json({ message: 'Cart cleared', deletedCount: result.deletedCount });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to clear cart' });
      }
    });

    // order apis
    app.post('/orders', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.json(result);
    })
    app.get('/orders', async (req, res) => {
      try {
        const email = req.query.email; // optional
        const role = req.query.role;   // admin or user (optional but useful)

        let query = {};

        // 🔹 যদি admin না হয়, তাহলে শুধু নিজের order
        if (role !== "admin" && email) {
          query = {
            $or: [
              { userEmail: email },
              { "items.email": email }
            ]
          };
        }

        // 🔹 যদি admin হয়, তাহলে সব order পাবে (query = {} মানে সব)
        const orders = await orderCollection.find(query).toArray();

        res.json(orders);

      } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
      }
    });
    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const result = await orderCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } }
      );
      res.json(result);
    });



    // ⁡⁢⁣⁣Contact Message APIs⁡

    app.post('/contact', async (req, res) => {
      const message = req.body;
      const result = await MessageCollection.insertOne(message);
      res.json(result);
    });
    //⁡⁢⁣⁣ wishlist APIs⁡
    app.post('/wishlist', async (req, res) => {
      const wishlistItem = req.body;
      const result = await WishlistCollection.insertOne(wishlistItem);
      res.json(result);

    })
    app.get('/wishlist', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const wishlistItem = await WishlistCollection.find(query).toArray();
      res.json(wishlistItem);
    })
    // ⁡⁢⁣⁣user APIs⁡
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.json(result);
    })
    app.get('/users', async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.json(users);
    })

    // ⁡⁢⁣⁣admin api⁡
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      if (user && user.role === 'admin') {
        return res.json({ isAdmin: true });
      }
      res.json({ isAdmin: false });
    })
    // ⁡⁢⁣⁣make admin api⁡
    app.patch('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const { role } = req.body;
      const result = await userCollection.updateOne(
        { email: email },
        { $set: { role: role || 'customer' } }
      );
      res.json(result);
    })
    // 


    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.json(result);
    });

    // ⁡⁢⁣⁡⁢⁣⁣user behaviour api⁡
    app.post('/userBehaviour', async (req, res) => {
      const behaviour = { ...req.body, timeStamp: new Date() }
      const result = await userBehaviour.insertOne(behaviour);
      res.json(result);
    })
    // ⁡⁢⁣⁣recomandation api⁡




    // Recommendation API: match behaviour.productId to product _id (ObjectId/string) or product.productId


    // Robust Recommendation API
    app.get('/recommendation', async (req, res) => {
      try {
        const email = (req.query.email || '').trim();
        if (!email) return res.status(400).json({ error: "Email query parameter is required" });

        // fetch recent behaviours
        const behaviours = await userBehaviour
          .find({ email })
          .sort({ timeStamp: -1 })
          .limit(50)
          .toArray();

        if (!behaviours.length) return res.json([]);

        // For each behaviour try to resolve a product using several strategies
        const matchedProducts = [];
        for (const b of behaviours) {
          const val = String(b.productId ?? b._id ?? '').trim();
          if (!val) continue;

          let product = null;

          // 1) try as ObjectId
          if (ObjectId.isValid(val) && val.length === 24) {
            try {
              product = await ProductCollection.findOne({ _id: new ObjectId(val) });
            } catch (e) { /* ignore */ }
          }

          // 2) try as string _id
          if (!product) {
            product = await ProductCollection.findOne({ _id: val });
          }

          // 3) try by productId field (like "P1006")
          if (!product) {
            product = await ProductCollection.findOne({ productId: val });
          }

          if (product) matchedProducts.push(product);
        }

        if (!matchedProducts.length) return res.json([]);

        // extract categories and prepare exclusion lists
        const categories = [...new Set(matchedProducts.map(p => p.category).filter(Boolean))];
        const excludeObjectIds = matchedProducts
          .map(p => p._id)
          .filter(Boolean)
          .map(id => (typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id));
        const excludeProductIds = matchedProducts.map(p => p.productId).filter(Boolean);

        // build recommendation query
        const recQuery = {
          category: { $in: categories },
          $nor: []
        };
        if (excludeObjectIds.length) recQuery.$nor.push({ _id: { $in: excludeObjectIds } });
        if (excludeProductIds.length) recQuery.$nor.push({ productId: { $in: excludeProductIds } });

        const recommended = await ProductCollection.find(recQuery).limit(10).toArray();
        return res.json(recommended);
      } catch (error) {
        console.error("Recommendation error:", error);
        return res.status(500).json({ error: "Failed to fetch recommendations" });
      }
    });



    // ⁡⁢⁣⁣Analytics Dashboard APIs⁡
    app.get('/analytics', async (req, res) => {
      try {
        const topView = await userBehaviour.aggregate([
          { $match: { action: "view" } },
          { $group: { _id: "$productId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "productDetails"
            }
          },
          { $unwind: "$productDetails" },
          {
            $project: {
              _id: 1,
              count: 1,
              productName: "$productDetails.productName",
              category: "$productDetails.category",
              price: "$productDetails.price"
            }
          }
        ]).toArray();

        const topCart = await userBehaviour.aggregate([
          { $match: { action: "add_to_cart" } },
          { $group: { _id: "$productId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]).toArray();

        const wishlist = await userBehaviour.aggregate([
          { $match: { action: { $in: ["add_to_wishlist", "wishlist"] } } }, // match both possible action values
          { $group: { _id: "$productId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "productDetails"
            }
          },
          { $unwind: "$productDetails" },
          {
            $project: {
              _id: 1,
              count: 1,
              productName: "$productDetails.productName",
              category: "$productDetails.category",
              price: "$productDetails.price"
            }
          }
        ]).toArray();


        res.json({ topView, topCart, wishlist });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch analytics data" });
      }
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
})