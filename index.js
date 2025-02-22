const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.llz6n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db('task-management').collection('users');
    const tasksCollection = client.db('task-management').collection('task');

    // User-related API
    app.post('/users', async (req, res) => {
      const { uid, email, displayName } = req.body;

      // Check if the user already exists in the database
      const existingUser = await userCollection.findOne({ uid });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Store the new user details
      const newUser = {
        uid,
        email,
        displayName,
        createdAt: new Date(),
      };

      try {
        const result = await userCollection.insertOne(newUser);
        res.status(201).json({ message: 'User created successfully', result });
      } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Task-related API
    // Get all tasks
    app.get("/tasks", async (req, res) => {
      try {
        const tasks = await tasksCollection.find().sort({ order: 1 }).toArray();
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update a task
    app.put("/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedTask = req.body;

        // Remove _id from the update payload
        delete updatedTask._id;

        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedTask }
        );

        res.json({ message: "Task updated", result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Delete a task
    app.delete("/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        await tasksCollection.deleteOne({ _id: new ObjectId(id) });
        res.json({ message: "Task deleted" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Reorder tasks
    app.put("/tasks/reorder", async (req, res) => {
      try {
        const { tasks } = req.body;
        const bulkOps = tasks.map((task) => ({
          updateOne: {
            filter: { _id: new ObjectId(task._id) },
            update: { $set: { order: task.order } },
          },
        }));
        await tasksCollection.bulkWrite(bulkOps);
        res.json({ message: "Tasks reordered successfully" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add a new task
    app.post("/tasks", async (req, res) => {
      try {
        const { title, description, category, order } = req.body;
        const newTask = { title, description, category, order, timestamp: new Date() };
        const result = await tasksCollection.insertOne(newTask);
        const task = { _id: result.insertedId, ...newTask };
        res.status(201).json(task);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Task management server is running');
});

app.listen(port, () => {
  console.log(`Task management server is running on port: ${port}`);
});