import type { Metadata } from "next";
import { TeacherApp } from "@/teacher/TeacherApp";
import "@/teacher/teacher.css";

export const metadata: Metadata = { title: "Teacher · Trail Games" };

export default function TeacherPage() {
  return <TeacherApp />;
}
