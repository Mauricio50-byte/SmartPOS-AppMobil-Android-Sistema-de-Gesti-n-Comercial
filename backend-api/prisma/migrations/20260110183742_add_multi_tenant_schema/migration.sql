/*
  Warnings:

  - You are about to drop the column `accessMethod` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `loginToken` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `loginTokenExp` on the `Usuario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[authUserId]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Usuario_loginToken_key";

-- AlterTable
ALTER TABLE "Abono" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "Caja" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "DetalleVenta" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "Deuda" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "PagoGasto" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "negocioId" INTEGER;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "accessMethod",
DROP COLUMN "loginToken",
DROP COLUMN "loginTokenExp",
ADD COLUMN     "authUserId" UUID,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "negocioId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_authUserId_key" ON "Usuario"("authUserId");

-- AddForeignKey
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abono" ADD CONSTRAINT "Abono_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoGasto" ADD CONSTRAINT "PagoGasto_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
