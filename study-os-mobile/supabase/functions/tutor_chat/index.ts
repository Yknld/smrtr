// ============================================================================
// Edge Function: tutor_chat
// ============================================================================
// 
// Purpose: AI tutor chat endpoint with conversation history and RAG context
// 
// Request:
//   POST /tutor_chat
//   Headers: Authorization: Bearer <user_token>
//   Body: { 
//     conversationId?: string (null to create new),
//     lessonId?: string (optional lesson context),
//     courseId?: string (optional course context),
//     message: string
//   }
// 
// Response:
//   {
//     conversationId: string,
//     messageId: string,
//     assistantMessage: string,
//     title: string (conversation title)
//   }
// 
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TutorChatRequest {
  conversationId?: string | null;
  lessonId?: string | null;
  courseId?: string | null;
  message: string;
  /** Optional live transcript from current recording session (overrides or supplements DB transcript) */
  liveTranscript?: string | null;
}

interface CourseMaterial {
  id: string;
  title: string;
  type: string;
  text_content: string;
}

// System prompt for Smartr Tutor
const SYSTEM_PROMPT = `You are Smartr Tutor, an intelligent AI teaching assistant designed to help students learn effectively.

Your role:
- Help students understand concepts from their course materials
- Answer questions with clear, educational explanations
- Provide examples to illustrate key points
- Encourage active learning with follow-up questions
- Cite specific materials when answering from provided context

Format your responses using this structure when appropriate:

**Answer:**
Clear, direct answer to the student's question.

**Example:**
A concrete example that illustrates the concept.

**Quick Check:**
A brief question to verify understanding (optional).

**Summary:**
Key takeaway in 1-2 sentences.

**Sources Used:**
List the specific materials you referenced (if any).

Guidelines:
1. Prefer information from provided course materials over general knowledge
2. If you don't have enough context, ask clarifying questions
3. Never hallucinate citations - only reference materials explicitly provided
4. Keep explanations clear and educational
5. Encourage critical thinking with thoughtful follow-up questions
6. Be supportive and patient - learning takes time`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] tutor_chat request received`);

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: TutorChatRequest = await req.json();
    const { conversationId, lessonId, courseId, message, liveTranscript } = body;

    // Validate required fields
    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 2000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate JWT
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      console.error(`[${requestId}] Auth validation failed:`, authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Authenticated user: ${user.id}`);

    // Create user-context client for RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // -------------------------------------------------------------------------
    // STEP 1: Get or Create Conversation
    // -------------------------------------------------------------------------

    let activeConversationId = conversationId;
    let conversationTitle = "";

    if (!activeConversationId) {
      // Create new conversation
      // Title = first 60 chars of user message
      conversationTitle = message.substring(0, 60);
      if (message.length > 60) conversationTitle += "...";

      const { data: newConversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          lesson_id: lessonId || null,
          course_id: courseId || null,
          title: conversationTitle,
        })
        .select("id, title")
        .single();

      if (conversationError) {
        console.error(`[${requestId}] Failed to create conversation:`, conversationError);
        return new Response(
          JSON.stringify({ error: "Failed to create conversation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      activeConversationId = newConversation.id;
      conversationTitle = newConversation.title;
      console.log(`[${requestId}] Created new conversation: ${activeConversationId}`);
    } else {
      // Verify user owns this conversation
      const { data: existingConversation, error: verifyError } = await supabase
        .from("conversations")
        .select("id, title, lesson_id, course_id")
        .eq("id", activeConversationId)
        .single();

      if (verifyError || !existingConversation) {
        console.error(`[${requestId}] Conversation not found or access denied`);
        return new Response(
          JSON.stringify({ error: "Conversation not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      conversationTitle = existingConversation.title;
      console.log(`[${requestId}] Using existing conversation: ${activeConversationId}`);
    }

    // -------------------------------------------------------------------------
    // STEP 2: Insert User Message
    // -------------------------------------------------------------------------

    const { data: userMessage, error: userMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        user_id: user.id,
        role: "user",
        content: message,
      })
      .select("id")
      .single();

    if (userMessageError) {
      console.error(`[${requestId}] Failed to insert user message:`, userMessageError);
      return new Response(
        JSON.stringify({ error: "Failed to save message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Inserted user message: ${userMessage.id}`);

    // -------------------------------------------------------------------------
    // STEP 3: Fetch Recent Messages (Last 10)
    // -------------------------------------------------------------------------

    const { data: recentMessages, error: messagesError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true })
      .limit(10);

    if (messagesError) {
      console.error(`[${requestId}] Failed to fetch messages:`, messagesError);
      return new Response(
        JSON.stringify({ error: "Failed to load conversation history" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Fetched ${recentMessages?.length || 0} recent messages`);

    // -------------------------------------------------------------------------
    // STEP 4: Fetch Lesson Content (RAG Context)
    // -------------------------------------------------------------------------

    let courseMaterials: CourseMaterial[] = [];
    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

    // Get lesson/course context from conversation
    const { data: conversationContext } = await supabase
      .from("conversations")
      .select("lesson_id, course_id")
      .eq("id", activeConversationId)
      .single();

    const contextLessonId = conversationContext?.lesson_id || lessonId;

    // If we have lesson context, fetch actual lesson content
    if (contextLessonId) {
      // 1. Fetch lesson notes
      const { data: notesData } = await supabase
        .from("lesson_outputs")
        .select("notes_final_text, notes_raw_text")
        .eq("lesson_id", contextLessonId)
        .eq("type", "notes")
        .eq("status", "ready")
        .single();

      if (notesData && (notesData.notes_final_text || notesData.notes_raw_text)) {
        const notesText = notesData.notes_final_text || notesData.notes_raw_text;
        courseMaterials.push({
          id: "notes",
          title: "Lesson Notes",
          type: "notes",
          text_content: notesText.substring(0, 3000), // Limit to 3000 chars
        });
        console.log(`[${requestId}] Fetched lesson notes (${notesText.length} chars)`);
      }

      // 2. Fetch lesson transcript from study sessions
      const { data: sessions } = await supabase
        .from("study_sessions")
        .select("id")
        .eq("lesson_id", contextLessonId)
        .order("started_at", { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const { data: segments } = await supabase
          .from("live_transcript_segments")
          .select("text")
          .eq("study_session_id", sessions[0].id)
          .order("seq", { ascending: true });

        if (segments && segments.length > 0) {
          const transcriptText = segments.map(s => s.text).join(" ");
          courseMaterials.push({
            id: "transcript",
            title: "Lesson Transcript",
            type: "transcript",
            text_content: transcriptText.substring(0, 4000), // Limit to 4000 chars
          });
          console.log(`[${requestId}] Fetched transcript (${transcriptText.length} chars)`);
        }
      }

      // 3. Fetch lesson summary if available
      const { data: summaryData } = await supabase
        .from("lesson_outputs")
        .select("content_json")
        .eq("lesson_id", contextLessonId)
        .eq("type", "summary")
        .eq("status", "ready")
        .single();

      if (summaryData?.content_json?.summary) {
        courseMaterials.push({
          id: "summary",
          title: "Lesson Summary",
          type: "summary",
          text_content: summaryData.content_json.summary.substring(0, 2000),
        });
        console.log(`[${requestId}] Fetched lesson summary`);
      }

      // 4. Fetch lesson_assets (uploaded files) – text and images for tutor context
      const { data: assets } = await supabase
        .from("lesson_assets")
        .select("id, kind, storage_bucket, storage_path, mime_type")
        .eq("lesson_id", contextLessonId)
        .eq("user_id", user.id)
        .not("storage_path", "is", null);

      if (assets && assets.length > 0) {
        for (const asset of assets) {
          const bucket = asset.storage_bucket || "lesson-assets";
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(asset.storage_path);

          if (downloadError || !fileData) {
            console.warn(`[${requestId}] Could not download asset ${asset.id}:`, downloadError?.message);
            continue;
          }

          const mime = (asset.mime_type || "").toLowerCase();
          const kind = (asset.kind || "").toLowerCase();

          // Text assets: add to course materials
          if (
            mime === "text/plain" ||
            mime === "application/json" ||
            kind === "notes" ||
            (kind === "other" && mime.startsWith("text/"))
          ) {
            try {
              const textContent = await fileData.text();
              const filename = asset.storage_path?.split("/").pop() || "asset";
              courseMaterials.push({
                id: `asset-${asset.id}`,
                title: `Uploaded file: ${filename}`,
                type: "asset",
                text_content: textContent.substring(0, 3000),
              });
              console.log(`[${requestId}] Loaded text asset: ${filename}`);
            } catch {
              console.warn(`[${requestId}] Failed to read text asset ${asset.id}`);
            }
            continue;
          }

          // Image assets: collected and passed to Gemini below as inlineData (max 5 to stay within token limits)
          if (
            (kind === "image" || mime.startsWith("image/")) &&
            imageParts.length < 5
          ) {
            const arr = new Uint8Array(await fileData.arrayBuffer());
            let binary = "";
            const chunk = 8192;
            for (let i = 0; i < arr.length; i += chunk) {
              binary += String.fromCharCode(...arr.subarray(i, i + chunk));
            }
            const base64 = btoa(binary);
            const safeMime = mime || "image/png";
            imageParts.push({ inlineData: { mimeType: safeMime, data: base64 } });
            console.log(`[${requestId}] Loaded image asset for Gemini: ${asset.storage_path}`);
          }
        }
      }

      console.log(`[${requestId}] Total materials fetched: ${courseMaterials.length}`);
    }

    // When client sends live transcript (e.g. during live note-taking), use it so AI has latest content
    if (liveTranscript && liveTranscript.trim().length > 0) {
      const truncated = liveTranscript.trim().substring(0, 5000);
      courseMaterials.push({
        id: "live_transcript",
        title: "Live transcript (current session)",
        type: "transcript",
        text_content: truncated,
      });
      console.log(`[${requestId}] Using live transcript (${truncated.length} chars)`);
    }

    // -------------------------------------------------------------------------
    // STEP 5: Build Prompt for Gemini
    // -------------------------------------------------------------------------

    // Build context from course materials
    let contextSection = "";
    if (courseMaterials.length > 0 || imageParts.length > 0) {
      contextSection = "\n\n## Available Course Materials:\n\n";
      for (const material of courseMaterials) {
        // Truncate each material to 1500 chars to avoid token overflow
        const truncatedContent = material.text_content.length > 1500
          ? material.text_content.substring(0, 1500) + "...[truncated]"
          : material.text_content;

        contextSection += `### Material: ${material.title} (${material.type})\n`;
        contextSection += `ID: ${material.id}\n`;
        contextSection += `${truncatedContent}\n\n`;
      }
      if (imageParts.length > 0) {
        contextSection += `\nThe student has also attached ${imageParts.length} image(s) below. Use them to answer questions when relevant.\n\n`;
      }
    } else {
      const assetNote =
        imageParts.length > 0
          ? `\n\n## Attached images:\nThe student has provided ${imageParts.length} image(s) as course materials. Use them to answer questions when relevant.\n\n`
          : "";
      contextSection =
        "\n\n## Note:\nNo specific course materials are available for this conversation. Answer from general knowledge." +
        assetNote;
    }

    // Build conversation history (exclude the current message which is already at the end)
    const conversationHistory = recentMessages
      ?.filter(msg => msg.content !== message) // Exclude current message
      .map(msg => `${msg.role === "user" ? "Student" : "Smartr Tutor"}: ${msg.content}`)
      .join("\n\n") || "";

    const fullPrompt = `${SYSTEM_PROMPT}

${contextSection}

## Conversation History:
${conversationHistory || "[No previous messages]"}

## Current Question:
Student: ${message}

Please provide a helpful, educational response following the guidelines above.`;

    console.log(`[${requestId}] Prompt length: ${fullPrompt.length} chars`);

    // -------------------------------------------------------------------------
    // STEP 6: Call Gemini API
    // -------------------------------------------------------------------------

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error(`[${requestId}] GEMINI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    console.log(`[${requestId}] Calling Gemini... (${imageParts.length} image(s))`);

    const result =
      imageParts.length > 0
        ? await model.generateContent([fullPrompt, ...imageParts])
        : await model.generateContent(fullPrompt);
    const response = await result.response;
    const assistantMessage = response.text();

    console.log(`[${requestId}] Gemini response received (${assistantMessage.length} chars)`);

    // -------------------------------------------------------------------------
    // STEP 7: Insert Assistant Message
    // -------------------------------------------------------------------------

    const { data: assistantMsg, error: assistantError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        user_id: user.id,
        role: "assistant",
        content: assistantMessage,
      })
      .select("id")
      .single();

    if (assistantError) {
      console.error(`[${requestId}] Failed to insert assistant message:`, assistantError);
      // Return AI response anyway even if DB save fails
    } else {
      console.log(`[${requestId}] Inserted assistant message: ${assistantMsg.id}`);
    }

    // -------------------------------------------------------------------------
    // STEP 8: Log AI Usage (Optional)
    // -------------------------------------------------------------------------

    try {
      // Estimate tokens (rough approximation: 1 token ≈ 4 chars)
      const inputTokens = Math.ceil(fullPrompt.length / 4);
      const outputTokens = Math.ceil(assistantMessage.length / 4);

      await supabase.from("ai_usage").insert({
        user_id: user.id,
        conversation_id: activeConversationId,
        feature: "tutor_chat",
        model: "gemini-3-flash-preview",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      });

      console.log(`[${requestId}] Logged AI usage: ~${inputTokens} in, ~${outputTokens} out`);
    } catch (usageError) {
      console.warn(`[${requestId}] Failed to log AI usage:`, usageError);
      // Non-critical - continue
    }

    // -------------------------------------------------------------------------
    // STEP 9: Return Response
    // -------------------------------------------------------------------------

    return new Response(
      JSON.stringify({
        conversationId: activeConversationId,
        messageId: assistantMsg?.id || null,
        assistantMessage,
        title: conversationTitle,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
