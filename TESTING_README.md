# Testing Mercado Livre Integration

## 🚀 Quick Test Script

Run this command to test everything automatically:

```bash
npx tsx test-mercado-livre.ts
```

This script will:
- ✅ Check if your credentials are configured
- ✅ Test authentication
- ✅ Search for products
- ✅ Get product details
- ✅ Get seller information
- ✅ Show detailed results and error messages

## 📋 Manual Testing with .http File

1. Open `mercadolivre.http` in VS Code
2. Replace `YOUR_REAL_ACCESS_TOKEN_HERE` with your actual access token
3. Click "Send Request" on any test

## 🔧 Setup

Make sure your `.env` has:

```env
MERCADO_LIVRE_CLIENT_ID=your_client_id
MERCADO_LIVRE_CLIENT_SECRET=your_client_secret
MERCADO_LIVRE_REDIRECT_URI=http://localhost:3000/auth/mercado-livre/callback
MERCADO_LIVRE_ACCESS_TOKEN=your_access_token
```

## 📚 What Gets Tested

- **Authentication** - Verifies your access token works
- **Product Search** - Searches for "notebook" products
- **Product Details** - Gets full details of a product
- **Seller Info** - Gets seller reputation and status
- **Categories** - Lists available product categories

## 🛠️ Troubleshooting

### Authentication Error
- Check if your access token is valid
- Make sure it's not expired
- Verify the token has the right permissions

### Rate Limited
- Mercado Livre has API limits
- Wait a few seconds and try again

### Network Issues
- Check your internet connection
- Verify Mercado Livre API is accessible

## 📖 Next Steps

After testing works:
1. Delete `test-mercado-livre.ts` and `MERCADO_LIVRE_EXAMPLES.ts`
2. Create your real use cases following the patterns in the examples
3. Add routes to expose the functionality via HTTP endpoints
