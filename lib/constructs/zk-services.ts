import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

export interface ZKServicesProps {
  cluster: ecs.Cluster;
  vpc: ec2.Vpc;
  containerSecurityGroup: ec2.SecurityGroup;
  namespace: servicediscovery.PrivateDnsNamespace;
  ecsLogGroup: logs.LogGroup;
}

export class ZKServices extends Construct {
  public readonly zkProverService: ecs.FargateService;
  public readonly zkSettlementService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ZKServicesProps) {
    super(scope, id);

    const { cluster, vpc, containerSecurityGroup, namespace, ecsLogGroup } = props;

    // ========================================
    // ZK PROVER SERVICE
    // ========================================

    const zkProverTaskDef = new ecs.FargateTaskDefinition(this, 'ZKProverTaskDefinition', {
      family: 'shared-zk-prover',
      cpu: 256,
      memoryLimitMiB: 512,
    });

    zkProverTaskDef.addContainer('zk-prover', {
      image: ecs.ContainerImage.fromRegistry('ghcr.io/0glabs/zk:0.2.1'),
      environment: {
        JS_PROVER_PORT: '3001'
      },
      portMappings: [
        { containerPort: 3001, protocol: ecs.Protocol.TCP }
      ],
      healthCheck: {
        command: ['CMD', 'curl', '-f', '-X', 'GET', 'http://localhost:3001/sign-keypair'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 10,
        startPeriod: cdk.Duration.seconds(30)
      },
      logging: ecs.LogDriver.awsLogs({
        logGroup: ecsLogGroup,
        streamPrefix: 'zk-prover'
      })
    });

    this.zkProverService = new ecs.FargateService(this, 'ZKProverService', {
      cluster,
      taskDefinition: zkProverTaskDef,
      desiredCount: 1,
      serviceName: 'shared-zk-prover',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [containerSecurityGroup],
      cloudMapOptions: {
        name: 'zk-prover',
        cloudMapNamespace: namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A
      }
    });

    // ========================================
    // ZK SETTLEMENT SERVICE  
    // ========================================

    const zkSettlementTaskDef = new ecs.FargateTaskDefinition(this, 'ZKSettlementTaskDefinition', {
      family: 'shared-zk-settlement',
      cpu: 256,
      memoryLimitMiB: 512,
    });

    zkSettlementTaskDef.addContainer('zk-settlement', {
      image: ecs.ContainerImage.fromRegistry('ghcr.io/0glabs/zk:0.2.1'),
      environment: {
        JS_PROVER_PORT: '3002'
      },
      portMappings: [
        { containerPort: 3002, protocol: ecs.Protocol.TCP }
      ],
      healthCheck: {
        command: ['CMD', 'curl', '-f', '-X', 'GET', 'http://localhost:3002/sign-keypair'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 10,
        startPeriod: cdk.Duration.seconds(30)
      },
      logging: ecs.LogDriver.awsLogs({
        logGroup: ecsLogGroup,
        streamPrefix: 'zk-settlement'
      })
    });

    this.zkSettlementService = new ecs.FargateService(this, 'ZKSettlementService', {
      cluster,
      taskDefinition: zkSettlementTaskDef,
      desiredCount: 1,
      serviceName: 'shared-zk-settlement',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      securityGroups: [containerSecurityGroup],
      cloudMapOptions: {
        name: 'zk-settlement',
        cloudMapNamespace: namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A
      }
    });

    // Security group rules for ZK services
    containerSecurityGroup.addIngressRule(
      containerSecurityGroup, // Allow containers to talk to each other
      ec2.Port.tcp(3001),
      'Allow access to ZK prover'
    );

    containerSecurityGroup.addIngressRule(
      containerSecurityGroup,
      ec2.Port.tcp(3002), 
      'Allow access to ZK settlement'
    );
  }
}
