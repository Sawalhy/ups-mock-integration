import { Module } from "@nestjs/common";
import { RatesController } from "./rates.controller";
import { RatesService } from "./rates.service";
import { CarriersModule } from "../carriers/carriers.module";

@Module({
  imports: [CarriersModule],
  controllers: [RatesController],
  providers: [RatesService],
})
export class RatesModule {}
