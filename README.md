# Kubernetes-Event-Driven-Autoscaling-KEDA

End-to-end demo showing how to build an event-driven autoscaling system using **RabbitMQ**, **Node.js**, **Docker**, **Kubernetes**, and **KEDA**.

## Architecture

```text
Producer (Node.js)
        |
        v
+----------------+
| RabbitMQ Queue |
+----------------+
        |
        v
+----------------------+
| KEDA RabbitMQ Scaler |
+----------------------+
        |
        v
+----------------------+
| Horizontal Pod       |
| Autoscaler (HPA)     |
+----------------------+
        |
        v
+----------------------+
| Worker Deployment    |
+----------------------+
        |
        v
+----------------------+
| Worker Pods          |
+----------------------+
```

---

# Tech Stack

- Node.js
- RabbitMQ
- Docker
- Kubernetes (Kind)
- Helm
- KEDA

---

# Prerequisites

```bash
docker --version
kubectl version --client
kind version
helm version
node -v
npm -v
```

---

# Project Structure

```text
.
├── producer
│   ├── producer.js
│   └── package.json
├── worker
│   ├── worker.js
│   ├── Dockerfile
│   └── package.json
└── k8s
    ├── rabbitmq.yaml
    ├── worker-deployment.yaml
    └── worker-scaledobject.yaml
```

---

# Step 1 - Create Kind Cluster

```bash
kind create cluster --name keda-demo
kubectl cluster-info
kubectl get nodes
```

---

# Step 2 - Create Namespace

```bash
kubectl create namespace keda-demo
```

---

# Step 3 - Deploy RabbitMQ

rabbitmq.yaml deploys:

- Deployment
- Service

Apply:

```bash
kubectl apply -f rabbitmq.yaml
```

Verify:

```bash
kubectl get pods -n keda-demo
kubectl get svc -n keda-demo
```

Port forward:

```bash
kubectl port-forward -n keda-demo svc/rabbitmq 5672:5672 15672:15672
```

RabbitMQ UI:

http://localhost:15672

Default credentials:

```
guest
guest
```

---

# Step 4 - Producer

Initialize:

```bash
mkdir producer
cd producer

npm init -y
npm install amqplib
```

Run:

```bash
node producer.js
```

Producer publishes 100 messages into the `orders` queue.

Verify from RabbitMQ UI:

- Ready
- Unacked
- Total

---

# Step 5 - Worker

Initialize:

```bash
mkdir worker
cd worker

npm init -y
npm install amqplib
```

Worker responsibilities:

- Connect to RabbitMQ
- Consume queue
- Process message
- ACK message

Important concept:

RabbitMQ deletes a message **only after**

```javascript
channel.ack(msg)
```

---

# Step 6 - Dockerize Worker

Dockerfile:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node","worker.js"]
```

Build image

```bash
docker build -t worker:v1 .
```

Load into Kind

```bash
kind load docker-image worker:v1 --name keda-demo
```

---

# Step 7 - Deploy Worker

Apply deployment

```bash
kubectl apply -f worker-deployment.yaml
```

Verify

```bash
kubectl get deployment -n keda-demo
kubectl get pods -n keda-demo
kubectl logs deployment/worker -n keda-demo
```

Worker connects using Kubernetes DNS

```
rabbitmq
```

instead of

```
localhost
```

---

# Step 8 - Install KEDA

```bash
helm repo add kedacore https://kedacore.github.io/charts

helm repo update

helm install keda kedacore/keda \
--namespace keda \
--create-namespace
```

Verify

```bash
kubectl get pods -n keda
kubectl get crds | grep keda
```

---

# Step 9 - Create ScaledObject

Apply

```bash
kubectl apply -f worker-scaledobject.yaml
```

Verify

```bash
kubectl get scaledobject -n keda-demo
kubectl get hpa -n keda-demo
```

KEDA automatically creates the HPA.

---

# Important KEDA Concepts

## KEDA does NOT create Pods

Flow:

```text
RabbitMQ

↓

KEDA Operator

↓

External Metrics

↓

HPA

↓

Deployment

↓

ReplicaSet

↓

Pods
```

---

## HPA vs VPA vs KEDA

| Feature | HPA | VPA | KEDA |
|----------|-----|-----|------|
| Scale Pods | ✅ | ❌ | ✅ |
| Increase CPU | ❌ | ✅ | ❌ |
| Increase Memory | ❌ | ✅ | ❌ |
| Queue Based Scaling | ❌ | ❌ | ✅ |
| Scale to Zero | ❌ | ❌ | ✅ |

---

# Common Commands

Pods

```bash
kubectl get pods -A
```

Deployments

```bash
kubectl get deploy -A
```

Services

```bash
kubectl get svc -A
```

HPA

```bash
kubectl get hpa -A
```

ScaledObjects

```bash
kubectl get scaledobject -A
```

Logs

```bash
kubectl logs deployment/worker -n keda-demo
```

Describe

```bash
kubectl describe scaledobject worker-scaler -n keda-demo
```

---

# Troubleshooting

## ImagePullBackOff

Verify image exists

```bash
docker images
```

For Kind

```bash
kind load docker-image worker:v1 --name keda-demo
```

---

## HPA Not Created

Describe ScaledObject

```bash
kubectl describe scaledobject worker-scaler -n keda-demo
```

---

## DNS Error

If KEDA runs in another namespace use

```
rabbitmq.keda-demo.svc.cluster.local
```

instead of

```
rabbitmq
```

---

## Connection Refused

Verify

```bash
kubectl port-forward svc/rabbitmq \
5672:5672 \
15672:15672 \
-n keda-demo
```
