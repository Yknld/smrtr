/**
 * Test Script: AI Tutor Chat Integration
 * 
 * Tests the tutor_chat edge function end-to-end
 * 
 * Prerequisites:
 * 1. Supabase project URL and ANON_KEY configured
 * 2. Valid user account (or create one)
 * 3. GEMINI_API_KEY secret set in Supabase
 * 4. Migrations 012 and 013 applied
 * 5. tutor_chat function deployed
 * 
 * Usage:
 *   node scripts/test-tutor-chat.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "your-anon-key";
const TEST_EMAIL = process.env.TEST_EMAIL || "user1@test.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "password123";

// ============================================================================
// Helper Functions
// ============================================================================

async function signIn(email, password) {
  console.log("\n🔐 Signing in...");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sign in failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  console.log(`✅ Signed in as ${email}`);
  return data.access_token;
}

async function sendChatMessage(token, message, conversationId = null, lessonId = null) {
  console.log(`\n💬 Sending message: "${message.substring(0, 50)}..."`);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/tutor_chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      conversationId,
      lessonId,
      courseId: null,
      message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data;
}

async function verifyConversationInDB(token, conversationId) {
  console.log(`\n🔍 Verifying conversation ${conversationId} in database...`);
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/conversations?id=eq.${conversationId}&select=*`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`DB query failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.length === 0) {
    throw new Error("Conversation not found in database");
  }

  console.log(`✅ Conversation exists: "${data[0].title}"`);
  return data[0];
}

async function verifyMessagesInDB(token, conversationId) {
  console.log(`\n🔍 Verifying messages for conversation ${conversationId}...`);
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${conversationId}&select=*&order=created_at.asc`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`DB query failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ Found ${data.length} messages`);
  
  for (let i = 0; i < data.length; i++) {
    const msg = data[i];
    console.log(`   [${i + 1}] ${msg.role}: ${msg.content.substring(0, 60)}...`);
  }

  return data;
}

// ============================================================================
// Test Scenarios
// ============================================================================

async function testNewConversation(token) {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 1: Create New Conversation");
  console.log("=".repeat(70));

  const result = await sendChatMessage(
    token,
    "What is photosynthesis?"
  );

  console.log(`✅ Conversation created: ${result.conversationId}`);
  console.log(`✅ Title: "${result.title}"`);
  console.log(`✅ AI Response: ${result.assistantMessage.substring(0, 200)}...`);

  await verifyConversationInDB(token, result.conversationId);
  await verifyMessagesInDB(token, result.conversationId);

  return result.conversationId;
}

async function testContinueConversation(token, conversationId) {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 2: Continue Existing Conversation");
  console.log("=".repeat(70));

  const result = await sendChatMessage(
    token,
    "Can you give me an example of photosynthesis in action?",
    conversationId
  );

  console.log(`✅ Same conversation: ${result.conversationId === conversationId}`);
  console.log(`✅ AI Response: ${result.assistantMessage.substring(0, 200)}...`);

  const messages = await verifyMessagesInDB(token, conversationId);
  if (messages.length < 4) {
    throw new Error(`Expected at least 4 messages, got ${messages.length}`);
  }

  console.log(`✅ Conversation history maintained (${messages.length} messages)`);
}

async function testEdgeCases(token) {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 3: Edge Cases");
  console.log("=".repeat(70));

  // Test empty message
  try {
    await sendChatMessage(token, "");
    console.log("❌ Should have rejected empty message");
  } catch (error) {
    if (error.message.includes("400")) {
      console.log("✅ Empty message rejected");
    } else {
      throw error;
    }
  }

  // Test very long message
  try {
    const longMessage = "a".repeat(2001);
    await sendChatMessage(token, longMessage);
    console.log("❌ Should have rejected long message");
  } catch (error) {
    if (error.message.includes("400")) {
      console.log("✅ Long message rejected");
    } else {
      throw error;
    }
  }

  // Test invalid conversation ID
  try {
    await sendChatMessage(token, "Test", "00000000-0000-0000-0000-000000000000");
    console.log("❌ Should have rejected invalid conversation ID");
  } catch (error) {
    if (error.message.includes("404")) {
      console.log("✅ Invalid conversation ID rejected");
    } else {
      throw error;
    }
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log("\n🚀 Starting AI Tutor Chat Integration Tests");
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`👤 Test User: ${TEST_EMAIL}`);

  try {
    // Sign in
    const token = await signIn(TEST_EMAIL, TEST_PASSWORD);

    // Run tests
    const conversationId = await testNewConversation(token);
    await testContinueConversation(token, conversationId);
    await testEdgeCases(token);

    console.log("\n" + "=".repeat(70));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ TEST FAILED");
    console.error("=".repeat(70));
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, sendChatMessage, signIn };
