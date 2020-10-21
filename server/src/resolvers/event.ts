import { Event } from '../entities/Event';
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from 'type-graphql';
import { MyContext } from 'src/types';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { getConnection } from 'typeorm';

@InputType()
class EventInput {
  @Field()
  title: string;
  @Field()
  description: string;
}

@Resolver()
export class EventResolver {
  @Query(() => [Event])
  async events(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<Event[]> {
    const realLimit = Math.min(50, limit);
    const qb = getConnection()
      .getRepository(Event)
      .createQueryBuilder('e')
      .orderBy('"createdAt"', 'DESC')
      .take(realLimit);

    if (cursor) {
      qb.where('"createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }

    return qb.getMany();
  }

  @Query(() => Event, { nullable: true })
  event(@Arg('id') id: number): Promise<Event | undefined> {
    return Event.findOne(id);
  }

  @Mutation(() => Event)
  @UseMiddleware(isAuthenticated)
  async createEvent(
    @Arg('input') input: EventInput,
    @Ctx() { req }: MyContext
  ): Promise<Event> {
    return Event.create({
      ...input,
      creatorId: req.session.userId,
      code: this.generateCode(),
    }).save();
  }

  @Mutation(() => Event, { nullable: true })
  async updateEvent(
    @Arg('id') id: number,
    @Arg('title', () => String, { nullable: true }) title: string
  ): Promise<Event | null> {
    const event = await Event.findOne(id);
    if (!event) {
      return null;
    }
    if (typeof title !== 'undefined') {
      event.title = title;
      await Event.update({ id }, { title });
    }
    return event;
  }

  @Mutation(() => Boolean)
  async deleteEvent(@Arg('id') id: number): Promise<boolean> {
    await Event.delete(id);
    return true;
  }

  generateCode(): string {
    var result = '';
    var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 4; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
}
