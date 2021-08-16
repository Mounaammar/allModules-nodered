import { MigrationInterface, QueryRunner } from "typeorm";
export declare class MakeStoppedAtNullable1607431743767 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
