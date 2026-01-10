"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * 🔑 technicianId
   * מקור אמת זמני
   * בעתיד יגיע מ־auth / context
   */
  const technicianId = "17117717";

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">הפרויקטים שלי</h1>

      {loading && <p>טוען פרויקטים...</p>}

      {!loading && projects.length === 0 && (
        <p className="text-gray-600">אין פרויקטים משויכים אליך</p>
      )}

      <div className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
          >
            <div>
              <h2 className="text-lg font-semibold">
                {project.name}
              </h2>
            </div>

            {/* 🔹 העברת projectName + technicianId */}
            <Link
              href={`/project/${project.id}?technicianId=${technicianId}&projectName=${encodeURIComponent(
                project.name
              )}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              כניסה לפרויקט
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
