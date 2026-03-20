import { storagePut, storageGet } from './server/storage';
import dotenv from 'dotenv';
dotenv.config();

async function testStorage() {
  console.log("Testing GCS Migration...");
  console.log(`Project: ${process.env.GCP_PROJECT_ID}`);
  console.log(`Bucket: ${process.env.GCS_BUCKET_NAME}`);

  try {
    const testKey = `test/migration-check-${Date.now()}.txt`;
    const testData = "Hello from Google Cloud Storage Migration!";
    
    console.log(`\n1. Testing storagePut: ${testKey}`);
    const putResult = await storagePut(testKey, testData, "text/plain");
    console.log("✅ storagePut success!");
    console.log(`   Key: ${putResult.key}`);
    console.log(`   URL: ${putResult.url}`);

    console.log(`\n2. Testing storageGet: ${testKey}`);
    const getResult = await storageGet(testKey);
    console.log("✅ storageGet success!");
    console.log(`   URL: ${getResult.url}`);

    if (putResult.url === getResult.url) {
        console.log("\n✨ Storage Migration Verified Successfully!");
    } else {
        console.warn("\n❌ URL mismatch detected.");
    }

  } catch (error) {
    console.error("\n❌ Storage test failed:");
    console.error(error);
    console.log("\nPossible causes:");
    console.log("- GCP_PROJECT_ID or GCS_BUCKET_NAME not set correctly in .env");
    console.log("- GCP_KEY_FILE_PATH missing or invalid");
    console.log("- Bucket permissions (ensure the bucket exists and is public if using public URLs)");
  }
}

testStorage();
