import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RatesModule } from "./rates/rates.module";
import { CarriersModule } from "./carriers/carriers.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CarriersModule,
    RatesModule,
  ],
})
export class AppModule {}
