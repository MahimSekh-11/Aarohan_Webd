var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// api/models.ts
var models_exports = {};
__export(models_exports, {
  Lead: () => Lead,
  MOCK_DB: () => MOCK_DB,
  Notification: () => Notification,
  Product: () => Product,
  Review: () => Review,
  User: () => User
});
var import_mongoose, userSchema, User, productSchema, Product, leadSchema, Lead, reviewSchema, Review, notificationSchema, Notification, MOCK_DB;
var init_models = __esm({
  "api/models.ts"() {
    import_mongoose = __toESM(require("mongoose"), 1);
    userSchema = new import_mongoose.Schema({
      name: { type: String, required: true },
      phone: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ["admin", "manager", "customer"], default: "customer" },
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
      address: { type: String },
      storeName: { type: String },
      // For store managers
      location: { type: String }
      // For store managers
    }, { timestamps: true });
    userSchema.index({ role: 1 });
    userSchema.index({ status: 1 });
    userSchema.index({ phone: 1 });
    User = import_mongoose.default.model("User", userSchema);
    productSchema = new import_mongoose.Schema({
      name: { type: String, required: true },
      description: { type: String, required: true },
      price: { type: Number, required: true },
      offer: { type: Number, default: 0 },
      actualPrice: { type: Number, required: true },
      quantity: { type: Number, default: 1 },
      category: { type: String, required: true },
      images: [{ type: String }],
      deliveryAvailable: { type: Boolean, default: false },
      managerId: { type: import_mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      storeDetails: {
        storeName: String,
        location: String,
        contactNumber: String
      }
    }, { timestamps: true });
    productSchema.index({ managerId: 1 });
    productSchema.index({ category: 1 });
    Product = import_mongoose.default.model("Product", productSchema);
    leadSchema = new import_mongoose.Schema({
      customer: { type: import_mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      manager: { type: import_mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      product: { type: import_mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      productDetails: {
        name: String,
        price: Number,
        actualPrice: Number,
        quantity: Number,
        images: [String],
        storeDetails: {
          storeName: String,
          location: String,
          contactNumber: String
        }
      },
      status: { type: String, enum: ["new", "contacted", "resolved"], default: "new" },
      customerDetails: {
        name: String,
        phone: String,
        address: String
      }
    }, { timestamps: true });
    leadSchema.index({ customer: 1 });
    leadSchema.index({ manager: 1 });
    leadSchema.index({ status: 1 });
    Lead = import_mongoose.default.model("Lead", leadSchema);
    reviewSchema = new import_mongoose.Schema({
      product: { type: import_mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      customer: { type: import_mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      text: { type: String, required: true },
      customerName: { type: String }
    }, { timestamps: true });
    reviewSchema.index({ product: 1 });
    Review = import_mongoose.default.model("Review", reviewSchema);
    notificationSchema = new import_mongoose.Schema({
      recipient: { type: import_mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      message: { type: String, required: true },
      read: { type: Boolean, default: false },
      link: { type: String }
      // optional link to navigate to
    }, { timestamps: true });
    notificationSchema.index({ recipient: 1, read: 1 });
    Notification = import_mongoose.default.model("Notification", notificationSchema);
    MOCK_DB = {
      users: [],
      products: [],
      leads: [],
      reviews: [],
      notifications: []
    };
  }
});

// api/aiService.ts
var aiService_exports = {};
__export(aiService_exports, {
  convertAudioBuffer: () => convertAudioBuffer,
  initializeAI: () => initializeAI,
  parseIntent: () => parseIntent,
  transcribeAudio: () => transcribeAudio,
  translateText: () => translateText
});
async function initializeAI() {
  console.log("Initializing local AI models. This may take a while on first run (downloading weights)...");
  try {
    if (!transcriber) {
      console.log("Loading Whisper model (Speech-to-Text)...");
      transcriber = await (0, import_transformers.pipeline)("automatic-speech-recognition", "Xenova/whisper-tiny");
    }
    if (!translator) {
      console.log("Loading NLLB model (Translation)...");
      translator = await (0, import_transformers.pipeline)("translation", "Xenova/nllb-200-distilled-600M");
    }
    console.log("AI models loaded successfully.");
  } catch (err) {
    console.error("Error loading AI models:", err);
  }
}
function convertAudioBuffer(buffer) {
  const wav = new WaveFile(buffer);
  wav.toBitDepth("32f");
  wav.toSampleRate(16e3);
  let audioData = wav.getSamples();
  if (Array.isArray(audioData)) {
    audioData = audioData[0];
  }
  return audioData;
}
async function transcribeAudio(audioBuffer) {
  if (!transcriber) await initializeAI();
  try {
    const audioData = convertAudioBuffer(audioBuffer);
    const result = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: "english",
      task: "transcribe"
    });
    return result.text;
  } catch (err) {
    console.error("Transcription error:", err);
    throw err;
  }
}
async function translateText(text, srcLang, tgtLang) {
  if (!translator) await initializeAI();
  const src = langCodes[srcLang] || "eng_Latn";
  const tgt = langCodes[tgtLang] || "eng_Latn";
  if (src === tgt) return text;
  try {
    const result = await translator(text, {
      src_lang: src,
      tgt_lang: tgt
    });
    return result[0].translation_text;
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}
async function parseIntent(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("add") || lowerText.includes("create") || lowerText.includes("new product")) {
    const qtyMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(kg|g|liters?|pcs|packets?)/);
    const priceMatch = lowerText.match(/(?:for|rs|rupees)\s*(\d+(?:\.\d+)?)/) || lowerText.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs)/);
    let name = text.replace(/add|create|new product|for|rupees|rs/gi, "").trim();
    if (qtyMatch) name = name.replace(qtyMatch[0], "");
    if (priceMatch) name = name.replace(priceMatch[0], "");
    name = name.replace(/of|with/gi, "").replace(/\s+/g, " ").trim();
    name = name.charAt(0).toUpperCase() + name.slice(1);
    const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
    const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
    let category = "Others";
    if (/rice|wheat|dal|grains/i.test(name)) category = "Grains";
    else if (/apple|banana|mango|fruit/i.test(name)) category = "Fruits";
    else if (/potato|onion|tomato|vegetable/i.test(name)) category = "Vegetables";
    return {
      action: "create_product",
      data: {
        name: name || "Unnamed Product",
        description: `Locally sourced ${name || "product"}. Quantity: ${qtyMatch ? qtyMatch[0] : 1}`,
        price,
        actualPrice: Math.round(price * 1.1),
        quantity,
        category,
        deliveryAvailable: true
      },
      message: `I understood you want to add a product: ${name}, Price: \u20B9${price}.`
    };
  } else if (lowerText.includes("find") || lowerText.includes("search") || lowerText.includes("looking for")) {
    let query = text.replace(/find|search|looking for|me|some/gi, "").trim();
    return {
      action: "search_product",
      data: { search: query },
      message: `Searching for ${query}...`
    };
  }
  return {
    action: "unknown",
    message: "I did not understand the command."
  };
}
var import_transformers, import_wavefile, WaveFile, transcriber, translator, langCodes;
var init_aiService = __esm({
  "api/aiService.ts"() {
    import_transformers = require("@xenova/transformers");
    import_wavefile = __toESM(require("wavefile"), 1);
    ({ WaveFile } = import_wavefile.default);
    import_transformers.env.allowLocalModels = false;
    import_transformers.env.useBrowserCache = false;
    transcriber = null;
    translator = null;
    langCodes = {
      "hi": "hin_Deva",
      // Hindi
      "bn": "ben_Beng",
      // Bengali
      "en": "eng_Latn"
      // English
    };
  }
});

// server.ts
var import_express2 = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_mongoose2 = __toESM(require("mongoose"), 1);
var import_dns = __toESM(require("dns"), 1);
var import_vite = require("vite");

// api/routes.ts
var import_express = require("express");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
init_models();

// api/middleware.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
init_models();
var authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return;
    }
    const decoded = import_jsonwebtoken.default.verify(token, process.env.JWT_SECRET || "village-ecommerce-secret");
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }
};
var requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
};

// api/routes.ts
var import_multer = __toESM(require("multer"), 1);
var upload = (0, import_multer.default)({ storage: import_multer.default.memoryStorage() });
var apiRouter = (0, import_express.Router)();
var JWT_SECRET = process.env.JWT_SECRET || "village-ecommerce-secret";
apiRouter.post("/auth/register", async (req, res) => {
  try {
    const { name, phone, password, role, address, storeName, location } = req.body;
    const existing = await User.findOne({ phone });
    if (existing) {
      if (existing.status === "rejected") {
        await User.deleteOne({ _id: existing._id });
      } else {
        res.status(400).json({ message: "Phone number already registered. Multiple active accounts with the same phone number are not allowed." });
        return;
      }
    }
    const hashedPassword = await import_bcryptjs.default.hash(password, 10);
    const status = role === "manager" ? "pending" : "approved";
    const user = await User.create({
      name,
      phone,
      password: hashedPassword,
      role,
      status,
      address,
      storeName,
      location
    });
    res.status(201).json({ message: "Registration successful", userId: user._id, status: user.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const isValid = await import_bcryptjs.default.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    if (user.status === "pending") {
      res.status(403).json({ message: "Your account is pending admin approval." });
      return;
    }
    if (user.status === "rejected") {
      res.status(403).json({ message: "Your account has been rejected." });
      return;
    }
    const token = import_jsonwebtoken2.default.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { _id: user._id, name: user.name, role: user.role, storeName: user.storeName } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
apiRouter.get("/admin/analytics", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const customerCount = await User.countDocuments({ role: "customer", status: "approved" });
    const managerCount = await User.countDocuments({ role: "manager" });
    const productCount = await Product.countDocuments();
    res.json({ customerCount, managerCount, productCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.get("/admin/managers", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const managers = await User.find({ role: "manager" }).select("-password");
  res.json(managers);
});
apiRouter.put("/admin/managers/:id/status", authMiddleware, requireRole(["admin"]), async (req, res) => {
  const { status } = req.body;
  if (status === "rejected") {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ message: "Manager access revoked and account deleted from database", user: deletedUser });
    return;
  }
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  res.json({ message: `Manager status updated to ${status}`, user });
});
apiRouter.get("/admin/customers", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const customers = await User.find({ role: "customer" }).select("-password");
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.put("/admin/customers/:id/status", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const { status } = req.body;
    if (status === "rejected") {
      const deletedUser = await User.findByIdAndDelete(req.params.id);
      if (!deletedUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json({ message: "Customer access revoked and account deleted from database", user: deletedUser });
      return;
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ message: `Customer status updated to ${status}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.post("/products", authMiddleware, requireRole(["manager"]), async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      managerId: req.user._id,
      storeDetails: {
        storeName: req.user.storeName,
        location: req.user.location,
        contactNumber: req.user.phone
      }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
apiRouter.put("/products/:id", authMiddleware, requireRole(["manager"]), async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, managerId: req.user._id },
    req.body,
    { new: true }
  );
  if (!product) {
    res.status(404).json({ message: "Product not found or unauthorized" });
    return;
  }
  res.json(product);
});
apiRouter.delete("/products/:id", authMiddleware, requireRole(["manager"]), async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, managerId: req.user._id });
  if (!product) {
    res.status(404).json({ message: "Product not found or unauthorized" });
    return;
  }
  res.json({ message: "Product deleted" });
});
apiRouter.get("/manager/products", authMiddleware, requireRole(["manager"]), async (req, res) => {
  const products = await Product.find({ managerId: req.user._id }).sort({ createdAt: -1 });
  res.json(products);
});
apiRouter.get("/products", async (req, res) => {
  try {
    const { category, minPrice, maxPrice, deliveryAvailable, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (deliveryAvailable === "true") filter.deliveryAvailable = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.post("/leads", authMiddleware, requireRole(["customer"]), async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    const lead = await Lead.create({
      customer: req.user._id,
      manager: product.managerId,
      product: product._id,
      productDetails: {
        name: product.name,
        price: product.price,
        actualPrice: product.actualPrice,
        quantity: product.quantity,
        images: product.images,
        storeDetails: product.storeDetails
      },
      customerDetails: {
        name: req.user.name,
        phone: req.user.phone,
        address: req.user.address
      }
    });
    await Promise.resolve().then(() => (init_models(), models_exports)).then(({ Notification: Notification2 }) => {
      Notification2.create({
        recipient: product.managerId,
        message: `New interest from ${req.user.name} for ${product.name}.`
      });
    });
    res.status(201).json({ message: "Request sent to the store manager.", lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.get("/manager/leads", authMiddleware, requireRole(["manager"]), async (req, res) => {
  const leads = await Lead.find({ manager: req.user._id }).populate("product").sort({ createdAt: -1 });
  res.json(leads);
});
apiRouter.get("/customer/leads", authMiddleware, requireRole(["customer"]), async (req, res) => {
  const leads = await Lead.find({ customer: req.user._id }).populate("product").sort({ createdAt: -1 });
  res.json(leads);
});
apiRouter.put("/leads/:id/status", authMiddleware, requireRole(["manager"]), async (req, res) => {
  const { status } = req.body;
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, manager: req.user._id },
    { status },
    { new: true }
  ).populate("product");
  if (!lead) {
    res.status(404).json({ message: "Lead not found" });
    return;
  }
  if (status === "resolved" && lead.product) {
    const product = lead.product;
    lead.productDetails = {
      name: product.name,
      price: product.price,
      actualPrice: product.actualPrice,
      quantity: product.quantity,
      // this is the original quantity before decreasing
      images: product.images,
      storeDetails: product.storeDetails
    };
    await lead.save();
    if (typeof product.quantity === "number") {
      product.quantity -= 1;
      if (product.quantity <= 0) {
        await Product.findByIdAndDelete(product._id);
      } else {
        await Product.findByIdAndUpdate(product._id, { quantity: product.quantity });
      }
    }
  }
  await Promise.resolve().then(() => (init_models(), models_exports)).then(({ Notification: Notification2 }) => {
    Notification2.create({
      recipient: lead.customer,
      message: `Your request for ${lead.product?.name || "a product"} was marked as ${status}.`
    });
  });
  res.json(lead);
});
apiRouter.get("/products/:id/reviews", async (req, res) => {
  try {
    const { Review: Review2 } = await Promise.resolve().then(() => (init_models(), models_exports));
    const reviews = await Review2.find({ product: req.params.id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.post("/products/:id/reviews", authMiddleware, requireRole(["customer"]), async (req, res) => {
  try {
    const { rating, text } = req.body;
    const { Review: Review2 } = await Promise.resolve().then(() => (init_models(), models_exports));
    const review = await Review2.create({
      product: req.params.id,
      customer: req.user._id,
      customerName: req.user.name,
      rating,
      text
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.get("/notifications", authMiddleware, async (req, res) => {
  try {
    const { Notification: Notification2 } = await Promise.resolve().then(() => (init_models(), models_exports));
    const notifications = await Notification2.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.put("/notifications/:id/read", authMiddleware, async (req, res) => {
  try {
    const { Notification: Notification2 } = await Promise.resolve().then(() => (init_models(), models_exports));
    const notification = await Notification2.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
apiRouter.post("/ai/transcribe-and-intent", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No audio file provided" });
      return;
    }
    const { transcribeAudio: transcribeAudio2, parseIntent: parseIntent2 } = await Promise.resolve().then(() => (init_aiService(), aiService_exports));
    let transcript = await transcribeAudio2(req.file.buffer);
    const intent = await parseIntent2(transcript);
    res.json({ transcript, intent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
apiRouter.post("/ai/translate", async (req, res) => {
  try {
    const { text, sourceLang = "en", targetLang } = req.body;
    if (!text || !targetLang) {
      res.status(400).json({ message: "text and targetLang are required" });
      return;
    }
    const { translateText: translateText2 } = await Promise.resolve().then(() => (init_aiService(), aiService_exports));
    if (Array.isArray(text)) {
      const translated = await Promise.all(text.map((t) => translateText2(t, sourceLang, targetLang)));
      res.json({ translatedText: translated });
      return;
    }
    const translatedText = await translateText2(text, sourceLang, targetLang);
    res.json({ translatedText });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// server.ts
init_models();
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
try {
  import_dns.default.setServers(["8.8.8.8", "1.1.1.1"]);
  console.log("Configured custom DNS servers (8.8.8.8, 1.1.1.1) for MongoDB Atlas SRV resolution.");
} catch (dnsErr) {
  console.warn("Could not set custom DNS servers, using system default:", dnsErr);
}
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express2.default.json({ limit: "50mb" }));
  app.use(import_express2.default.urlencoded({ limit: "50mb", extended: true }));
  try {
    let connected = false;
    if (process.env.MONGODB_URI) {
      console.log("Connecting to provided MONGODB_URI...");
      try {
        await import_mongoose2.default.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5e3 });
        console.log("Connected to MongoDB Atlas successfully.");
        connected = true;
      } catch (e) {
        console.error("Failed to connect to MongoDB Atlas, falling back to in-memory db:", e);
        process.env.MONGODB_URI = "";
      }
    }
    if (!process.env.MONGODB_URI) {
      console.log("Starting in-memory MongoDB Server for preview...");
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create();
      await import_mongoose2.default.connect(mongoServer.getUri());
      console.log("Connected to In-Memory MongoDB.");
      connected = true;
    }
    if (connected) {
      const adminExists = await User.findOne({ role: "admin" });
      if (!adminExists) {
        const hashedPassword = await import_bcryptjs2.default.hash("Mahim@28", 10);
        await User.create({
          name: "Tiorkhali Mart Admin",
          phone: "9832187950",
          password: hashedPassword,
          role: "admin",
          status: "approved"
        });
        console.log("Seeded default admin user: 00000000 / ##########");
      }
    }
  } catch (err) {
    console.error("Database connection failed:", err);
  }
  app.use("/api", apiRouter);
  app.use("/api", (req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });
  app.use("/api", (err, req, res, next) => {
    console.error("API Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
