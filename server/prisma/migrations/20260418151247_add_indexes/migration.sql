-- CreateIndex
CREATE INDEX "Drop_availableStock_idx" ON "Drop"("availableStock");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

-- CreateIndex
CREATE INDEX "Reservation_dropId_status_idx" ON "Reservation"("dropId", "status");

-- CreateIndex
CREATE INDEX "Reservation_status_expiresAt_idx" ON "Reservation"("status", "expiresAt");
