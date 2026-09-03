import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { redisProviders } from 'src/redis/redis.provider';

@Module({
  providers: [
    ChatGateway,
    ...redisProviders
  ],
})
export class WebsocketsModule {}
