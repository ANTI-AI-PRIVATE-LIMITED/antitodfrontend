import type {
  AgentMetrics,
  ListContainersResponse,
  ListDeploymentsResponse,
  ListTemplatesResponse,
  ServerDetailResponse,
  ServerOverviewItem,
  ServersOverviewResponse,
} from '../../../api/services/agentService';
import type { Shipper } from '../../../api/services/adminService';

export const DEMO_INFRA_TOOLTIP = 'Sign in with a customer account to register live servers, agents, and shippers';

const DEMO_SERVERS: ServerOverviewItem[] = [
  {
    ServerId: 'demo-edge-sensor-01',
    Hostname: 'us-west-honeypot-01',
    PublicIp: '203.0.113.10',
    PrivateIp: '10.0.1.24',
    Region: 'us-west-2',
    Provider: 'aws',
    Os: 'Ubuntu 24.04 LTS',
    DockerVersion: '27.3.1',
    AgentStatus: 'online',
    CreatedAt: '2026-11-12T08:15:00.000Z',
    agent: {
      isRegistered: true,
      agentId: 'agent-demo-01',
      status: 'online',
      lastHeartbeat: '2026-11-26T14:00:00.000Z',
    },
    shipper: {
      isRegistered: true,
      shipperId: 'ship-demo-01',
      allowedIp: '203.0.113.10',
      active: true,
    },
    deployments: {
      active: 2,
      total: 2,
    },
  },
  {
    ServerId: 'demo-edge-sensor-02',
    Hostname: 'eu-central-decoy-02',
    PublicIp: '203.0.113.24',
    PrivateIp: '10.0.2.18',
    Region: 'eu-central-1',
    Provider: 'aws',
    Os: 'Ubuntu 24.04 LTS',
    DockerVersion: null,
    AgentStatus: 'none',
    CreatedAt: '2026-11-18T11:30:00.000Z',
    agent: {
      isRegistered: false,
    },
    shipper: {
      isRegistered: false,
    },
    deployments: {
      active: 0,
      total: 0,
    },
  },
];

export const DEMO_SERVERS_OVERVIEW: ServersOverviewResponse = {
  message: 'Read-only demo sandbox preview',
  count: DEMO_SERVERS.length,
  servers: DEMO_SERVERS,
};

export const DEMO_SHIPPERS: Shipper[] = [
  {
    ShipperId: 'ship-demo-01',
    ServerId: 'demo-edge-sensor-01',
    AllowedIp: '203.0.113.10',
    Active: true,
    CreatedAt: '2026-11-12T08:20:00.000Z',
    LastSeenAt: '2026-11-26T14:00:00.000Z',
  },
];

export const DEMO_TEMPLATES: ListTemplatesResponse = {
  message: 'Read-only demo templates',
  count: 2,
  templates: [
    {
      TemplateId: 'tpl-demo-cowrie',
      Name: 'Cowrie SSH / Telnet Sensor',
      Description: 'Medium-interaction SSH & Telnet honeypot capturing credentials, shell sessions, and malware payloads.',
      Category: 'honeypot',
      StackFileContent: 'services:\n  cowrie:\n    image: cowrie/cowrie:latest\n    ports:\n      - "2222:2222"',
      EnvTemplate: {
        COWRIE_HOSTNAME: { description: 'Reported sensor hostname', default: 'prod-jump-01', required: true },
      },
      IsActive: true,
      CreatedAt: '2026-11-01T00:00:00.000Z',
      UpdatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      TemplateId: 'tpl-demo-dionaea',
      Name: 'Dionaea Multi-Protocol Sensor',
      Description: 'Low-interaction multi-protocol honeypot exposing SMB, HTTP, FTP, and MSSQL trap listeners.',
      Category: 'honeypot',
      StackFileContent: 'services:\n  dionaea:\n    image: dinotools/dionaea:latest\n    ports:\n      - "445:445"',
      EnvTemplate: {},
      IsActive: true,
      CreatedAt: '2026-11-01T00:00:00.000Z',
      UpdatedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
};

export const getDemoServerDetail = (serverId: string): ServerDetailResponse => {
  const server = DEMO_SERVERS.find((s) => s.ServerId === serverId) ?? DEMO_SERVERS[0];
  return {
    server: {
      ServerId: server.ServerId,
      Hostname: server.Hostname,
      PublicIp: server.PublicIp,
      PrivateIp: server.PrivateIp,
      Region: server.Region,
      Provider: server.Provider,
      Os: server.Os,
      DockerVersion: server.DockerVersion,
      AgentStatus: server.AgentStatus,
      CreatedAt: server.CreatedAt,
    },
    agent: server.agent.isRegistered
      ? {
          isRegistered: true,
          AgentId: server.agent.agentId,
          ServerId: server.ServerId,
          PortainerEndpointId: 1,
          Status: server.agent.status,
          LastHeartbeat: server.agent.lastHeartbeat,
          AgentVersion: '2.21.1',
          DockerVersion: server.DockerVersion ?? '27.3.1',
          CreatedAt: server.CreatedAt,
        }
      : { isRegistered: false },
    shipper: server.shipper.isRegistered
      ? {
          isRegistered: true,
          ShipperId: server.shipper.shipperId,
          ServerId: server.ServerId,
          AllowedIp: server.shipper.allowedIp,
          Active: server.shipper.active,
          CreatedAt: server.CreatedAt,
        }
      : { isRegistered: false },
    deployments: server.agent.isRegistered
      ? [
          {
            DeploymentId: 'dep-demo-01',
            TemplateId: 'tpl-demo-cowrie',
            StackName: 'antitode-cowrie-edge',
            Status: 'active',
            PortainerStackId: 101,
            CreatedAt: server.CreatedAt,
            templateName: 'Cowrie SSH / Telnet Sensor',
            templateCategory: 'honeypot',
          },
          {
            DeploymentId: 'dep-demo-02',
            TemplateId: 'tpl-demo-dionaea',
            StackName: 'antitode-dionaea-edge',
            Status: 'active',
            PortainerStackId: 102,
            CreatedAt: server.CreatedAt,
            templateName: 'Dionaea Multi-Protocol Sensor',
            templateCategory: 'honeypot',
          },
        ]
      : [],
  };
};

export const getDemoContainers = (serverId: string): ListContainersResponse => {
  const server = DEMO_SERVERS.find((s) => s.ServerId === serverId) ?? DEMO_SERVERS[0];
  const agentId = server.agent.isRegistered ? server.agent.agentId : '';
  return {
    agentId,
    serverId: server.ServerId,
    count: agentId ? 2 : 0,
    containers: agentId
      ? [
          {
            id: 'cnt-demo-cowrie',
            name: 'antitode-cowrie-edge',
            image: 'cowrie/cowrie:latest',
            state: 'running',
            status: 'Up 14 days',
            created: server.CreatedAt,
            ports: [{ hostPort: 2222, containerPort: 2222, type: 'tcp' }],
            labels: { 'antitode.managed': 'true' },
            isXyberah: true,
            xyberahType: 'cowrie',
          },
          {
            id: 'cnt-demo-dionaea',
            name: 'antitode-dionaea-edge',
            image: 'dinotools/dionaea:latest',
            state: 'running',
            status: 'Up 14 days',
            created: server.CreatedAt,
            ports: [{ hostPort: 445, containerPort: 445, type: 'tcp' }],
            labels: { 'antitode.managed': 'true' },
            isXyberah: true,
            xyberahType: 'dionaea',
          },
        ]
      : [],
  };
};

export const getDemoDeployments = (serverId: string): ListDeploymentsResponse => {
  const detail = getDemoServerDetail(serverId);
  const agentId = detail.agent.isRegistered ? detail.agent.AgentId : '';
  return {
    agentId,
    serverId: detail.server.ServerId,
    count: detail.deployments.length,
    deployments: detail.deployments.map((dep) => ({
      ...dep,
      ServerId: detail.server.ServerId,
      AgentId: agentId,
      EnvVars: { COWRIE_HOSTNAME: detail.server.Hostname },
      ErrorMessage: null,
      UpdatedAt: detail.server.CreatedAt,
    })),
  };
};

export const getDemoAgentMetrics = (serverId: string): AgentMetrics => {
  const server = DEMO_SERVERS.find((s) => s.ServerId === serverId) ?? DEMO_SERVERS[0];
  return {
    serverId: server.ServerId,
    agentId: server.agent.isRegistered ? server.agent.agentId : '',
    agentStatus: server.agent.isRegistered ? server.agent.status : 'offline',
    lastHeartbeat: server.agent.isRegistered ? server.agent.lastHeartbeat : server.CreatedAt,
    docker: {
      version: server.DockerVersion ?? '27.3.1',
      os: server.Os ?? 'Ubuntu 24.04 LTS',
      architecture: 'x86_64',
      kernelVersion: '6.8.0-aws',
    },
    resources: {
      cpuCount: 4,
      memoryTotalBytes: 8 * 1024 * 1024 * 1024,
      memoryTotalMB: 8192,
    },
    containers: {
      total: 2,
      running: 2,
      stopped: 0,
      paused: 0,
    },
    storage: {
      images: 3,
      volumes: 2,
    },
    note: 'Read-only demo sandbox snapshot',
  };
};
