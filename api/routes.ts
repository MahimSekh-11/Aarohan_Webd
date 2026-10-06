import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Product, Lead } from './models';
import { authMiddleware, requireRole } from './middleware';
import multer from 'multer';
import { transcribeAudio, translateText, parseIntent } from './aiService';

const upload = multer({ storage: multer.memoryStorage() });

export const apiRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'village-ecommerce-secret';

// --- Auth Routes ---
apiRouter.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, password, role, address, storeName, location } = req.body;
    const existing = await User.findOne({ phone });
    if (existing) {
      if (existing.status === 'rejected') {
        // If the account was revoked/rejected, delete the old document so they can sign up again cleanly
        await User.deleteOne({ _id: existing._id });
      } else {
        res.status(400).json({ message: 'Phone number already registered. Multiple active accounts with the same phone number are not allowed.' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const status = role === 'manager' ? 'pending' : 'approved'; // Managers require admin approval

    const user = await User.create({
      name, phone, password: hashedPassword, role, status, address, storeName, location
    });

    res.status(201).json({ message: 'Registration successful', userId: user._id, status: user.status });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
       res.status(401).json({ message: 'Invalid credentials' });
       return;
    }

    const isValid = await bcrypt.compare(password, user.password as string);
    if (!isValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (user.status === 'pending') {
      res.status(403).json({ message: 'Your account is pending admin approval.' });
      return;
    }
    if (user.status === 'rejected') {
      res.status(403).json({ message: 'Your account has been rejected.' });
      return;
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, role: user.role, storeName: user.storeName } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// --- Admin Routes ---
apiRouter.get('/admin/analytics', authMiddleware, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const customerCount = await User.countDocuments({ role: 'customer', status: 'approved' });
    const managerCount = await User.countDocuments({ role: 'manager' });
    const productCount = await Product.countDocuments();
    res.json({ customerCount, managerCount, productCount });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.get('/admin/managers', authMiddleware, requireRole(['admin']), async (req: Request, res: Response) => {
  const managers = await User.find({ role: 'manager' }).select('-password');
  res.json(managers);
});

apiRouter.put('/admin/managers/:id/status', authMiddleware, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body; // approved or rejected
  if (status === 'rejected') {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) { res.status(404).json({ message: 'User not found' }); return; }
    res.json({ message: 'Manager access revoked and account deleted from database', user: deletedUser });
    return;
  }
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json({ message: `Manager status updated to ${status}`, user });
});

apiRouter.get('/admin/customers', authMiddleware, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password');
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.put('/admin/customers/:id/status', authMiddleware, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body; // approved or rejected (rejected means access removed/revoked)
    if (status === 'rejected') {
      const deletedUser = await User.findByIdAndDelete(req.params.id);
      if (!deletedUser) { res.status(404).json({ message: 'User not found' }); return; }
      res.json({ message: 'Customer access revoked and account deleted from database', user: deletedUser });
      return;
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json({ message: `Customer status updated to ${status}`, user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- Store Manager Routes ---
apiRouter.post('/products', authMiddleware, requireRole(['manager']), async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.put('/products/:id', authMiddleware, requireRole(['manager']), async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, managerId: req.user._id },
    req.body,
    { new: true }
  );
  if (!product) { res.status(404).json({ message: 'Product not found or unauthorized' }); return; }
  res.json(product);
});

apiRouter.delete('/products/:id', authMiddleware, requireRole(['manager']), async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, managerId: req.user._id });
  if (!product) { res.status(404).json({ message: 'Product not found or unauthorized' }); return; }
  res.json({ message: 'Product deleted' });
});

apiRouter.get('/manager/products', authMiddleware, requireRole(['manager']), async (req: Request, res: Response) => {
  const products = await Product.find({ managerId: req.user._id }).sort({ createdAt: -1 });
  res.json(products);
});

// --- Customer Routes ---
// Public marketplace browser
apiRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const { category, minPrice, maxPrice, deliveryAvailable, search } = req.query;
    const filter: any = {};
    if (category) filter.category = category;
    if (deliveryAvailable === 'true') filter.deliveryAvailable = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Create Lead (I want to buy this)
apiRouter.post('/leads', authMiddleware, requireRole(['customer']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) { res.status(404).json({ message: 'Product not found' }); return; }

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

    // Notify Manager about new lead
    await import('./models').then(({ Notification }) => {
      Notification.create({
        recipient: product.managerId,
        message: `New interest from ${req.user.name} for ${product.name}.`
      });
    });

    res.status(201).json({ message: 'Request sent to the store manager.', lead });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Get Leads for Store Manager
apiRouter.get('/manager/leads', authMiddleware, requireRole(['manager']), async (req: Request, res: Response) => {
  const leads = await Lead.find({ manager: req.user._id })
    .populate('product')
    .sort({ createdAt: -1 });
  res.json(leads);
});

// Get My Leads (Customer)
apiRouter.get('/customer/leads', authMiddleware, requireRole(['customer']), async (req: Request, res: Response) => {
  const leads = await Lead.find({ customer: req.user._id })
    .populate('product')
    .sort({ createdAt: -1 });
  res.json(leads);
});

// Update Lead Status (Manager)
apiRouter.put('/leads/:id/status', authMiddleware, requireRole(['manager']), async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, manager: req.user._id },
    { status },
    { new: true }
  ).populate('product');
  if (!lead) { res.status(404).json({ message: 'Lead not found' }); return; }

  // If resolved, decrease quantity by 1, and delete product if quantity reaches 0
  if (status === 'resolved' && lead.product) {
    const product = lead.product as any;
    
    lead.productDetails = {
      name: product.name,
      price: product.price,
      actualPrice: product.actualPrice,
      quantity: product.quantity, // this is the original quantity before decreasing
      images: product.images,
      storeDetails: product.storeDetails
    };
    await lead.save();

    if (typeof product.quantity === 'number') {
      product.quantity -= 1;
      if (product.quantity <= 0) {
        await Product.findByIdAndDelete(product._id);
      } else {
        await Product.findByIdAndUpdate(product._id, { quantity: product.quantity });
      }
    }
  }

  // Notify Customer about status update
  await import('./models').then(({ Notification }) => {
    Notification.create({
      recipient: lead.customer,
      message: `Your request for ${(lead.product as any)?.name || 'a product'} was marked as ${status}.`
    });
  });

  res.json(lead);
});

// --- Reviews Routes ---
apiRouter.get('/products/:id/reviews', async (req: Request, res: Response) => {
  try {
    const { Review } = await import('./models');
    const reviews = await Review.find({ product: req.params.id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.post('/products/:id/reviews', authMiddleware, requireRole(['customer']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating, text } = req.body;
    const { Review } = await import('./models');
    const review = await Review.create({
      product: req.params.id,
      customer: req.user._id,
      customerName: req.user.name,
      rating,
      text
    });
    res.status(201).json(review);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- Notifications Routes ---
apiRouter.get('/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { Notification } = await import('./models');
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

apiRouter.put('/notifications/:id/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { Notification } = await import('./models');
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- Local AI Routes ---
apiRouter.post('/ai/transcribe-and-intent', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No audio file provided' });
      return;
    }

    // 1. Transcribe audio to text locally
    let transcript = await transcribeAudio(req.file.buffer);
    
    // 2. Parse intent from text
    const intent = await parseIntent(transcript);

    res.json({ transcript, intent });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

apiRouter.post('/ai/translate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, sourceLang = 'en', targetLang } = req.body;
    if (!text || !targetLang) {
      res.status(400).json({ message: 'text and targetLang are required' });
      return;
    }
    
    // If multiple strings in array
    if (Array.isArray(text)) {
      const translated = await Promise.all(text.map(t => translateText(t, sourceLang, targetLang)));
      res.json({ translatedText: translated });
      return;
    }

    const translatedText = await translateText(text, sourceLang, targetLang);
    res.json({ translatedText });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
