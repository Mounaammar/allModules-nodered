import { MigrationInterface, QueryRunner } from "typeorm";
export declare class CreateIndexStoppedAt1594828256133 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
