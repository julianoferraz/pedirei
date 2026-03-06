-- Feature 8: Sugestões com IA

-- Plan flag
ALTER TABLE "Plan" ADD COLUMN "hasAiSuggestions" BOOLEAN NOT NULL DEFAULT false;
