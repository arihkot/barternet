import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Layout from "../components/Layout";

vi.mock("../components/Navbar", () => ({
  default: () => <nav data-testid="mock-navbar">Mock Navbar</nav>,
}));

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children", () => {
    render(
      <Layout>
        <p data-testid="child-content">Hello World</p>
      </Layout>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders Navbar inside it", () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
  });

  it("renders children and Navbar together in the correct structure", () => {
    const { container } = render(
      <Layout>
        <span data-testid="inner">Dashboard Content</span>
      </Layout>
    );

    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
    expect(screen.getByTestId("inner")).toBeInTheDocument();
    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();

    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toContainElement(screen.getByTestId("inner"));
  });
});
