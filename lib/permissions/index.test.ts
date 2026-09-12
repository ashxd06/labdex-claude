import { describe, it, expect } from "vitest";
import { getRoleLabel, isAdmin, isLabStaff } from "@/lib/permissions";
import type { Profile } from "@/lib/supabase/types";

function makeProfile(role: Profile["role"]): Profile {
  return {
    id: "u1",
    full_name: "Test User",
    avatar_url: null,
    role,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("getRoleLabel", () => {
  it('devuelve "Administrador" para role admin', () => {
    expect(getRoleLabel(makeProfile("admin"))).toBe("Administrador");
  });

  it('devuelve "Personal de laboratorio" para role lab_staff (Fase 7, hallazgo #4)', () => {
    expect(getRoleLabel(makeProfile("lab_staff"))).toBe("Personal de laboratorio");
  });

  it('devuelve "Usuario" para role user', () => {
    expect(getRoleLabel(makeProfile("user"))).toBe("Usuario");
  });

  it('devuelve "Usuario" cuando no hay perfil (sesión sin fila en profiles)', () => {
    expect(getRoleLabel(null)).toBe("Usuario");
  });
});

describe("isAdmin / isLabStaff (regresión — no deben verse afectados por getRoleLabel)", () => {
  it("admin cuenta como lab staff", () => {
    expect(isLabStaff(makeProfile("admin"))).toBe(true);
    expect(isAdmin(makeProfile("admin"))).toBe(true);
  });

  it("lab_staff no es admin pero sí lab staff", () => {
    expect(isLabStaff(makeProfile("lab_staff"))).toBe(true);
    expect(isAdmin(makeProfile("lab_staff"))).toBe(false);
  });

  it("user no es admin ni lab staff", () => {
    expect(isLabStaff(makeProfile("user"))).toBe(false);
    expect(isAdmin(makeProfile("user"))).toBe(false);
  });
});
