#!/usr/bin/env node

/**
 * Test script for translation buffer logic
 * Simulates the exact flow of partial transcript updates
 */

const BUFFER_SIZE = 7;

class TranslationBufferTest {
  constructor() {
    this.wordBuffer = [];
    this.seenSequences = new Set();
    this.lastProcessedPartial = '';
    this.lastTranslatedPartial = '';
    this.translatedTexts = [];
  }

  sequenceHash(words) {
    return words.join(' ').toLowerCase();
  }

  addPartialToBuffer(partialText) {
    const currentText = partialText.trim();
    const lastText = this.lastProcessedPartial.trim();
    
    if (!currentText) return;
    
    // Extract only NEW words by comparing with last partial
    let newWords = [];
    
    if (!lastText) {
      // First partial - add all words
      newWords = currentText.split(/\s+/).filter(w => w.length > 0);
      console.log(`[Buffer] 📝 First partial, adding all ${newWords.length} words`);
    } else if (currentText.startsWith(lastText)) {
      // Current text is an extension of last text - extract new part
      const newPart = currentText.substring(lastText.length).trim();
      newWords = newPart.split(/\s+/).filter(w => w.length > 0);
      console.log(`[Buffer] ➕ Adding ${newWords.length} new words: "${newWords.join(' ')}"`);
    } else {
      // Text changed completely (shouldn't happen often) - add all
      newWords = currentText.split(/\s+/).filter(w => w.length > 0);
      console.log('[Buffer] ⚠️ Partial text changed unexpectedly, adding all words');
    }
    
    // Add new words to buffer
    for (const word of newWords) {
      this.wordBuffer.push(word);
      
      // Keep buffer at exactly BUFFER_SIZE by sliding window
      if (this.wordBuffer.length > BUFFER_SIZE) {
        const removed = this.wordBuffer.shift();
        console.log(`[Buffer] 🔄 Sliding window: removed "${removed}"`);
      }
    }
    
    // Update last processed partial
    this.lastProcessedPartial = currentText;
    
    const bufferPreview = this.wordBuffer.join(' ');
    console.log(`[Buffer] 📦 Current buffer: "${bufferPreview}" (${this.wordBuffer.length}/${BUFFER_SIZE} words)`);
    
    // When buffer is full, check if it's a unique sequence
    if (this.wordBuffer.length === BUFFER_SIZE) {
      const seqHash = this.sequenceHash(this.wordBuffer);
      
      if (!this.seenSequences.has(seqHash)) {
        console.log('[Buffer] ✅ New unique sequence! Would translate now');
        this.seenSequences.add(seqHash);
        
        // ⚠️ IMPORTANT: Only translate the NEW portion we haven't translated yet
        const lastTranslated = this.lastTranslatedPartial;
        const newPortionToTranslate = currentText.substring(lastTranslated.length).trim();
        
        if (newPortionToTranslate) {
          console.log(`[Buffer] 📤 Translating NEW portion only: "${newPortionToTranslate.substring(0, 50)}"`);
          this.translateBufferSequence(newPortionToTranslate);
          this.lastTranslatedPartial = currentText; // Mark as translated
        } else {
          console.log('[Buffer] ⏭️ No new portion to translate (already translated)');
        }
      } else {
        console.log('[Buffer] 💰 Duplicate sequence, skipping (cost saved!)');
      }
    } else {
      console.log(`[Buffer] ⏸️ Buffer not full yet (${this.wordBuffer.length}/${BUFFER_SIZE})`);
    }
    
    console.log(''); // Empty line for readability
  }

  translateBufferSequence(text) {
    console.log(`[Translation] 🚀 Translating: "${text}"`);
    this.translatedTexts.push(text);
  }

  resetBuffer() {
    console.log('[Buffer] 🔄 Final transcript received, resetting buffer');
    this.wordBuffer = [];
    this.seenSequences.clear();
    this.lastProcessedPartial = '';
    this.lastTranslatedPartial = '';
    console.log('');
  }

  printSummary() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total translations: ${this.translatedTexts.length}`);
    console.log(`Unique sequences seen: ${this.seenSequences.size}`);
    console.log('\nTranslated texts:');
    this.translatedTexts.forEach((text, i) => {
      console.log(`  ${i + 1}. "${text}"`);
    });
    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

// ============================================================================
// TEST CASE 1: Simulating real partial updates
// ============================================================================
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TEST CASE 1: Continuous partial updates (realistic flow)');
console.log('═══════════════════════════════════════════════════════════\n');

const test1 = new TranslationBufferTest();

// Simulate how AssemblyAI sends partials (gradually extending)
const partials1 = [
  "to check",
  "to check if",
  "to check if the",
  "to check if the transcription",
  "to check if the transcription works",
  "to check if the transcription works if",
  "to check if the transcription works if the",
  "to check if the transcription works if the transcription",
  "to check if the transcription works if the transcription works",
  "to check if the transcription works if the transcription works and",
  "to check if the transcription works if the transcription works and if",
  "to check if the transcription works if the transcription works and if the",
  "to check if the transcription works if the transcription works and if the translation",
  "to check if the transcription works if the transcription works and if the translation works",
  "to check if the transcription works if the transcription works and if the translation works and",
  "to check if the transcription works if the transcription works and if the translation works and if",
  "to check if the transcription works if the transcription works and if the translation works and if the",
  "to check if the transcription works if the transcription works and if the translation works and if the translation",
  "to check if the transcription works if the transcription works and if the translation works and if the translation works",
  "to check if the transcription works if the transcription works and if the translation works and if the translation works correctly",
];

partials1.forEach((partial, i) => {
  console.log(`\n📥 Partial update ${i + 1}: "${partial}"`);
  console.log('─────────────────────────────────────────────────────────');
  test1.addPartialToBuffer(partial);
});

test1.printSummary();

// ============================================================================
// TEST CASE 2: Final transcript reset behavior
// ============================================================================
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TEST CASE 2: Reset on final transcript');
console.log('═══════════════════════════════════════════════════════════\n');

const test2 = new TranslationBufferTest();

const partials2a = [
  "why are",
  "why are you",
  "why are you not",
  "why are you not translating",
  "why are you not translating this",
  "why are you not translating this text",
  "why are you not translating this text for",
];

console.log('📝 First sentence (before final):');
partials2a.forEach((partial, i) => {
  console.log(`\n📥 Partial ${i + 1}: "${partial}"`);
  console.log('─────────────────────────────────────────────────────────');
  test2.addPartialToBuffer(partial);
});

// Simulate final transcript (sentence complete)
console.log('\n🏁 FINAL TRANSCRIPT RECEIVED\n');
test2.resetBuffer();

// Continue with new sentence
const partials2b = [
  "okay so",
  "okay so now",
  "okay so now we",
  "okay so now we test",
  "okay so now we test the",
  "okay so now we test the next",
  "okay so now we test the next sentence",
  "okay so now we test the next sentence after",
  "okay so now we test the next sentence after the",
  "okay so now we test the next sentence after the reset",
];

console.log('📝 Second sentence (after reset):');
partials2b.forEach((partial, i) => {
  console.log(`\n📥 Partial ${i + 1}: "${partial}"`);
  console.log('─────────────────────────────────────────────────────────');
  test2.addPartialToBuffer(partial);
});

test2.printSummary();

// ============================================================================
// TEST CASE 3: Duplicate detection (cost savings)
// ============================================================================
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TEST CASE 3: Duplicate sequence detection');
console.log('═══════════════════════════════════════════════════════════\n');

const test3 = new TranslationBufferTest();

// Same partial repeated multiple times (simulating slow speech or pauses)
const partials3 = [
  "testing one two three four five six seven",
  "testing one two three four five six seven", // duplicate
  "testing one two three four five six seven", // duplicate
  "testing one two three four five six seven eight", // new word
  "testing one two three four five six seven eight", // duplicate
  "testing one two three four five six seven eight nine", // new word
];

partials3.forEach((partial, i) => {
  console.log(`\n📥 Partial update ${i + 1}: "${partial}"`);
  console.log('─────────────────────────────────────────────────────────');
  test3.addPartialToBuffer(partial);
});

test3.printSummary();

// ============================================================================
// FINAL VERDICT
// ============================================================================
console.log('═══════════════════════════════════════════════════════════');
console.log('✅ ALL TESTS COMPLETED');
console.log('═══════════════════════════════════════════════════════════');
console.log('\n📋 Expected behavior:');
console.log('  1. ✅ Buffer fills to exactly 7 words');
console.log('  2. ✅ Only NEW words are added (not re-adding old ones)');
console.log('  3. ✅ Sliding window removes oldest word when > 7');
console.log('  4. ✅ Duplicate sequences are skipped (cost savings)');
console.log('  5. ✅ Buffer resets correctly on final transcript');
console.log('  6. ✅ Translation continues after reset\n');
console.log('If all these behaviors are shown above, the logic is CORRECT! 🎉\n');
