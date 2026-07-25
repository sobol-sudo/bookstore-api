import { PrismaClient, Role, BookStatus, RentalDuration, OrderType, Author, Category, Book, User } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---------------------
  // Create authors
  // ---------------------
  const authors: Author[] = [];
  for (let i = 0; i < 10; i++) {
    const author = await prisma.author.create({
      data: {
        name: faker.person.fullName(),
        bio: faker.lorem.paragraph(),
      },
    });
    authors.push(author);
  }

  // ---------------------
  // Create categories
  // ---------------------
  const categories: Category[] = [];
  for (let i = 0; i < 5; i++) {
    const category = await prisma.category.create({
      data: { name: faker.word.words({ count: 2 }) },
    });
    categories.push(category);
  }

  // ---------------------
  // Create books
  // ---------------------
  const books: Book[] = [];
  for (let i = 0; i < 30; i++) {
    const book = await prisma.book.create({
      data: {
        title: faker.lorem.words({ min: 3, max: 3 }),
        description: faker.lorem.sentences({ min: 1, max: 3 }),
        authorId: faker.helpers.arrayElement(authors).id,
        categoryId: faker.helpers.arrayElement(categories).id,
        year: faker.number.int({ min: 1900, max: 2025 }),
        priceCents: faker.number.int({ min: 1000, max: 5000 }),
        rentPriceCents: faker.number.int({ min: 200, max: 800 }),
        status: faker.helpers.arrayElement([BookStatus.AVAILABLE, BookStatus.MAINTENANCE]),
        available: true,
        coverUrl: faker.image.urlLoremFlickr({ category: 'books' }),
      },
    });
    books.push(book);
  }

  // ---------------------
  // Create users
  // ---------------------
  const users: User[] = [];
  // Admin
  const hashedPassword = await bcrypt.hash('adminpass', 10);
  users.push(await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  }));

  // 10 regular users
  for (let i = 0; i < 10; i++) {
    const hashedPassword = await bcrypt.hash('password', 10);
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: hashedPassword,
        name: faker.person.fullName(),
        role: Role.USER,
      },
    });
    users.push(user);
  }

  // ---------------------
  // Create orders and rentals
  // ---------------------
  for (let i = 0; i < 20; i++) {
    const user = faker.helpers.arrayElement(users);
    const book = faker.helpers.arrayElement(books);
    const orderType = faker.helpers.arrayElement([OrderType.RENTAL, OrderType.PURCHASE]);

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        bookId: book.id,
        type: orderType,
      },
    });

    if (orderType === OrderType.RENTAL) {
      const now = new Date();
      const durations = {
        TWO_WEEKS: 14,
        ONE_MONTH: 30,
        THREE_MONTHS: 90,
      } as Record<RentalDuration, number>;

      const duration = faker.helpers.arrayElement([
        RentalDuration.TWO_WEEKS,
        RentalDuration.ONE_MONTH,
        RentalDuration.THREE_MONTHS,
      ]);
      const endAt = new Date(now.getTime() + durations[duration] * 24 * 60 * 60 * 1000);

      await prisma.rental.create({
        data: {
          orderId: order.id,
          userId: user.id,
          bookId: book.id,
          startAt: now,
          endAt,
          duration,
          isActive: true,
          autoReminderAt: new Date(endAt.getTime() - 24 * 60 * 60 * 1000), // 1 day before the end
        },
      });
    }
  }

  // ---------------------
  // Create notifications
  // ---------------------
  for (const user of users) {
    const count = faker.number.int({ min: 1, max: 5 });
    for (let i = 0; i < count; i++) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          message: faker.lorem.sentence(),
          read: faker.datatype.boolean(),
          sentAt: faker.date.recent({ days: 10 }),
        },
      });
    }
  }

  console.log('✅ Seeding finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });