import { MigrationInterface, QueryRunner } from "typeorm";
export declare class CreateIndexStoppedAt1594825041918 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
