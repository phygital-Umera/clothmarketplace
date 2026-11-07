-- Customer profile
ALTER TABLE "User" ADD COLUMN "gender" TEXT, ADD COLUMN "dateOfBirth" DATE;

-- Reviews: fit and photos
ALTER TABLE "ProductReview" ADD COLUMN "fit" TEXT, ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Returns: refund or exchange, photos
ALTER TABLE "ReturnRequest" ADD COLUMN "resolution" TEXT NOT NULL DEFAULT 'REFUND',
    ADD COLUMN "exchangeFor" TEXT,
    ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Customer notifications
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Help page messages
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "topic" TEXT NOT NULL,
    "orderNumber" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
