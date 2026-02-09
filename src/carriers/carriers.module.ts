import { Module } from "@nestjs/common";
import { CarrierRegistry } from "./registry/carrier-registry.service";
import { UpsModule } from "./ups/ups.module";

@Module({
  imports: [UpsModule],
  providers: [CarrierRegistry],
  exports: [CarrierRegistry],
})
export class CarriersModule {}
