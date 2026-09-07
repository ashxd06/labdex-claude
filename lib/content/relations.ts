"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";
import { isAdmin } from "@/lib/permissions";
import type { CultureMedia, LaboratoryTest, Procedure } from "@/lib/supabase/types";

async function client(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

async function assertAdmin() {
  const { profile } = await getSession();
  if (!isAdmin(profile)) {
    throw new Error("No tienes permisos para realizar esta acción.");
  }
}

export interface RelationOption {
  id: string;
  name: string;
  slug?: string;
}

export interface LinkedMedia extends RelationOption {
  notes: string | null;
}

export interface LinkedTest extends RelationOption {
  result_expected: string | null;
  notes: string | null;
}

export interface LinkedProcedure extends RelationOption {
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

export async function getRelationsData(microorganismId: string) {
  const supabase = await client();

  const [allMedia, allTests, allProcedures, linkedMediaRaw, linkedTestsRaw, linkedProceduresRaw] =
    await Promise.all([
      supabase.from("culture_media").select("id, name, slug").order("name") as unknown as Promise<{
        data: CultureMedia[] | null;
      }>,
      supabase.from("laboratory_tests").select("id, name, slug").order("name") as unknown as Promise<{
        data: LaboratoryTest[] | null;
      }>,
      supabase.from("procedures").select("id, name, slug").order("name") as unknown as Promise<{
        data: Procedure[] | null;
      }>,
      supabase
        .from("microorganism_media")
        .select("media_id, notes, culture_media(id, name, slug)")
        .eq("microorganism_id", microorganismId),
      supabase
        .from("microorganism_tests")
        .select("test_id, result_expected, notes, laboratory_tests(id, name, slug)")
        .eq("microorganism_id", microorganismId),
      supabase
        .from("microorganism_procedures")
        .select("procedure_id, notes, procedures(id, name, slug)")
        .eq("microorganism_id", microorganismId),
    ]);

  const linkedMedia: LinkedMedia[] = (linkedMediaRaw.data ?? []).map(
    (row: { media_id: string; notes: string | null; culture_media: { id: string; name: string; slug: string }[] | { id: string; name: string; slug: string } | null }) => {
      const media = Array.isArray(row.culture_media) ? row.culture_media[0] : row.culture_media;
      return { id: row.media_id, name: media?.name ?? "—", slug: media?.slug, notes: row.notes };
    }
  );

  const linkedTests: LinkedTest[] = (linkedTestsRaw.data ?? []).map(
    (row: {
      test_id: string;
      result_expected: string | null;
      notes: string | null;
      laboratory_tests: { id: string; name: string; slug: string }[] | { id: string; name: string; slug: string } | null;
    }) => {
      const test = Array.isArray(row.laboratory_tests) ? row.laboratory_tests[0] : row.laboratory_tests;
      return {
        id: row.test_id,
        name: test?.name ?? "—",
        slug: test?.slug,
        result_expected: row.result_expected,
        notes: row.notes,
      };
    }
  );

  const linkedProcedures: LinkedProcedure[] = (linkedProceduresRaw.data ?? []).map(
    (row: { procedure_id: string; notes: string | null; procedures: { id: string; name: string; slug: string }[] | { id: string; name: string; slug: string } | null }) => {
      const procedure = Array.isArray(row.procedures) ? row.procedures[0] : row.procedures;
      return { id: row.procedure_id, name: procedure?.name ?? "—", slug: procedure?.slug, notes: row.notes };
    }
  );

  const linkedMediaIds = new Set(linkedMedia.map((m) => m.id));
  const linkedTestIds = new Set(linkedTests.map((t) => t.id));
  const linkedProcedureIds = new Set(linkedProcedures.map((p) => p.id));

  return {
    availableMedia: (allMedia.data ?? []).filter((m) => !linkedMediaIds.has(m.id)),
    availableTests: (allTests.data ?? []).filter((t) => !linkedTestIds.has(t.id)),
    availableProcedures: (allProcedures.data ?? []).filter((p) => !linkedProcedureIds.has(p.id)),
    linkedMedia,
    linkedTests,
    linkedProcedures,
  };
}

// ---------------------------------------------------------------------------
// Escrituras (protegidas: solo admin, y RLS lo vuelve a exigir en Postgres)
// ---------------------------------------------------------------------------

export async function addMediaRelation(microorganismId: string, mediaId: string, notes: string) {
  await assertAdmin();
  const supabase = await client();
  await supabase
    .from("microorganism_media")
    .insert({ microorganism_id: microorganismId, media_id: mediaId, notes: notes || null });
  revalidatePath(`/admin/microorganismos/${microorganismId}`);
}

export async function removeMediaRelation(microorganismId: string, mediaId: string) {
  await assertAdmin();
  const supabase = await client();
  await supabase
    .from("microorganism_media")
    .delete()
    .eq("microorganism_id", microorganismId)
    .eq("media_id", mediaId);
  revalidatePath(`/admin/microorganismos/${microorganismId}`);
}

export async function addTestRelation(
  microorganismId: string,
  testId: string,
  resultExpected: string,
  notes: string
) {
  await assertAdmin();
  const supabase = await client();
  await supabase.from("microorganism_tests").insert({
    microorganism_id: microorganismId,
    test_id: testId,
    result_expected: resultExpected || null,
    notes: notes || null,
  });
  revalidatePath(`/admin/microorganismos/${microorganismId}`);
}

export async function removeTestRelation(microorganismId: string, testId: string) {
  await assertAdmin();
  const supabase = await client();
  await supabase
    .from("microorganism_tests")
    .delete()
    .eq("microorganism_id", microorganismId)
    .eq("test_id", testId);
  revalidatePath(`/admin/microorganismos/${microorganismId}`);
}

export async function addProcedureRelation(
  microorganismId: string,
  procedureId: string,
  notes: string
) {
  await assertAdmin();
  const supabase = await client();
  await supabase.from("microorganism_procedures").insert({
    microorganism_id: microorganismId,
    procedure_id: procedureId,
    notes: notes || null,
  });
  revalidatePath(`/admin/microorganismos/${microorganismId}`);
}

export async function removeProcedureRelation(microorganismId: string, procedureId: string) {
  await assertAdmin();
  const supabase = await client();
  await supabase
    .from("microorganism_procedures")
    .delete()
    .eq("microorganism_id", microorganismId)
    .eq("procedure_id", procedureId);
  revalidatePath(`/admin/microorganismos/${microorganismId}`);
}
