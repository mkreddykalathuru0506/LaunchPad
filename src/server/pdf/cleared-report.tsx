import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#0f172a" },
  header: { borderBottom: "1pt solid #cbd5e1", paddingBottom: 12, marginBottom: 18 },
  brand: { fontSize: 18, fontWeight: 700 },
  small: { color: "#64748b", fontSize: 9, marginTop: 2 },
  h1: { fontSize: 22, fontWeight: 700, marginVertical: 8 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 160, color: "#64748b" },
  value: { flex: 1 },
  pill: { padding: "2 6", backgroundColor: "#dcfce7", color: "#166534", borderRadius: 3, fontSize: 9 },
  stage: { borderBottom: "0.5pt solid #e2e8f0", paddingVertical: 4, flexDirection: "row", justifyContent: "space-between" },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#94a3b8", borderTop: "0.5pt solid #e2e8f0", paddingTop: 8 },
});

function Report({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Launch Pad · Clearance Report</Text>
          <Text style={styles.small}>ElivixIT Background Verification · Generated {formatDateTime(new Date())}</Text>
        </View>

        <Text style={styles.h1}>Background Verification: Cleared</Text>

        <View style={styles.row}><Text style={styles.label}>Case reference</Text><Text style={styles.value}>{data.reference}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Candidate</Text><Text style={styles.value}>{data.candidateName}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{data.candidateEmail}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Position</Text><Text style={styles.value}>{data.position}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Type</Text><Text style={styles.value}>{data.candidateType}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Start date</Text><Text style={styles.value}>{data.startDate}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Cleared by</Text><Text style={styles.value}>{data.clearedBy}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Cleared at</Text><Text style={styles.value}>{data.clearedAt}</Text></View>

        <Text style={styles.h2}>Stage outcomes</Text>
        {data.stages.map((s: any) => (
          <View key={s.type} style={styles.stage}>
            <Text>{s.type}</Text>
            <Text style={styles.pill}>APPROVED</Text>
          </View>
        ))}

        <Text style={styles.h2}>Statement</Text>
        <Text>
          The candidate named above has successfully completed all required stages of background
          verification. All evidence is retained in Launch Pad and is available for audit upon
          request, subject to applicable privacy regulations (FCRA, GDPR, DPDP).
        </Text>

        <Text style={styles.footer}>
          This document is system-generated. Verify integrity via the case audit log in Launch Pad.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateClearedReport(caseId: string): Promise<string> {
  const kase = await db.case.findUnique({
    where: { id: caseId },
    include: { candidate: { include: { user: true } }, stages: true, managedBy: true },
  });
  if (!kase) throw new Error("Case not found");

  const data = {
    reference: kase.reference,
    candidateName: kase.candidate.user.name ?? kase.candidate.user.email,
    candidateEmail: kase.candidate.user.email,
    position: kase.candidate.positionTitle ?? "—",
    candidateType: kase.candidate.candidateType,
    startDate: formatDate(kase.candidate.startDate),
    clearedBy: kase.managedBy?.name ?? kase.managedBy?.email ?? "—",
    clearedAt: formatDateTime(new Date()),
    stages: kase.stages.map((s) => ({ type: s.type })),
  };

  const buf = await renderToBuffer(<Report data={data} />);
  const stored = await storage.put(Buffer.from(buf), {
    contentType: "application/pdf",
    ext: "pdf",
    subdir: `${kase.id}/reports`,
  });
  await db.document.create({
    data: {
      caseId: kase.id,
      kind: "OTHER",
      filename: `Clearance-${kase.reference}.pdf`,
      storagePath: stored.storagePath,
      contentType: stored.contentType,
      sizeBytes: stored.size,
      sha256: stored.sha256,
      encrypted: false,
    },
  });
  return stored.storagePath;
}
