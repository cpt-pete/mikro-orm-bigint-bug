import {
  Collection,
  Entity,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Property,
  Enum,
} from "@mikro-orm/sqlite"; // or any other SQL driver package

@Entity()
export class User {
  // Unrealistic example, but it's just to show use case of forceEntityConstructor
  private role = "ADMIN";

  @PrimaryKey()
  id!: bigint;

  @Enum()
  name!: string;

  @OneToMany(() => UserComments, (x) => x.user)
  comments = new Collection<UserComments>(this);

  constructor(props: Pick<User, "name">) {
    this.name = props.name;
  }

  getRole() {
    return this.role;
  }
}

@Entity()
export class UserComments {
  @PrimaryKey()
  id!: bigint; // change to number to fix the issue

  @ManyToOne(() => User)
  user!: User;

  @Property()
  text!: string;
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [User, UserComments],
    debug: ["query", "query-params"],
    forceEntityConstructor: true,
    allowGlobalContext: true,
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("can load entity with bigint pk and access private variables", async () => {
  const user = new User({ name: "John Doe" });

  const comment = new UserComments();
  comment.text = "a comment";
  user.comments.add(comment);

  await orm.em.persistAndFlush(user);
  orm.em.clear();

  // error : SyntaxError: Cannot convert [object Object] to a BigInt
  const users = await orm.em.findAll(User, { populate: ["comments"] });
  expect(users[0].getRole()).toBe("ADMIN");
});
