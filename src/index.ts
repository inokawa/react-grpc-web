import { useState, useEffect } from "react";
import type * as grpcWeb from "grpc-web";

type AsObject<T> = T extends { toObject: (...args: any[]) => infer R }
  ? { [key in keyof R]: R[key] }
  : never;

type Constructable = new (...args: any[]) => any;

const toGetterName = (s: string): string =>
  "get" + s.slice(0, 1).toUpperCase() + s.slice(1);
const toSetterName = (s: string): string =>
  "set" + s.slice(0, 1).toUpperCase() + s.slice(1);

export const useUnaryRPC = <
  T extends (
    ...args: [
      any,
      grpcWeb.Metadata | null,
      (...cbArgs: [grpcWeb.RpcError, any]) => void
    ]
  ) => void,
  REQ extends Constructable
>(
  call: T,
  Request: REQ,
  { variables, meta }: { variables: AsObject<REQ>; meta?: grpcWeb.Metadata }
) => {
  type CB = Parameters<T>[2];
  type CBData = Parameters<CB>[1];
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AsObject<CBData> | null>(null);
  const [error, setError] = useState<grpcWeb.RpcError | null>(null);

  useEffect(() => {
    const request = new Request();
    try {
      Object.keys(variables).forEach((k) => {
        const v = (variables as any)[k];
        request[toSetterName(k)](v);
      });
    } catch (e) {
      console.log(e);
      return;
    }

    setLoading(true);
    setError(null);
    call(request, meta || null, (err, resp) => {
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        setData(resp.toObject());
      }
    });
  }, Object.values(variables));

  return { loading, data, error };
};

// export const useUnaryRPCLazy = () => {};

export const useServerStreamingRPC = <
  T extends (
    ...args: [any, grpcWeb.Metadata | null]
  ) => grpcWeb.ClientReadableStream<any>,
  REQ extends Constructable
>(
  call: T,
  Request: REQ,
  { variables, meta }: { variables: AsObject<REQ>; meta?: grpcWeb.Metadata }
) => {
  type CBData = ReturnType<T>;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AsObject<CBData>[] | null>(null);
  const [error, setError] = useState<grpcWeb.RpcError | null>(null);

  useEffect(() => {
    const request = new Request();
    try {
      Object.keys(variables).forEach((k) => {
        const v = (variables as any)[k];
        request[toSetterName(k)](v);
      });
    } catch (e) {
      console.log(e);
      return;
    }

    setLoading(true);
    setError(null);
    const stream = call(request, meta || null);
    stream.on("data", (resp) => {
      setData((prev) => [...(prev || []), resp.toObject()]);
    });
    stream.on("status", (status) => {
      // TODO
    });
    stream.on("end", () => {
      setLoading(false);
    });
  }, Object.values(variables));

  return { loading, data, error };
};
