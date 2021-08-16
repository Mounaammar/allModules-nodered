import { MigrationInterface, QueryRunner } from "typeorm";
export declare class UniqueWorkflowNames1620826335440 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
