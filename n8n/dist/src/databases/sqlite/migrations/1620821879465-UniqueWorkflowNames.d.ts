import { MigrationInterface, QueryRunner } from "typeorm";
export declare class UniqueWorkflowNames1620821879465 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
