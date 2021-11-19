package gov.cdc.usds.simplereport.test_util;

import org.springframework.test.context.TestContext;
import org.springframework.test.context.web.ServletTestExecutionListener;

public class TestExecutionListener extends ServletTestExecutionListener {
    @Override
    public void beforeTestClass(TestContext testContext) throws Exception {
        super.beforeTestMethod(testContext);
    }

    @Override
    public void afterTestClass(TestContext testContext) throws Exception {
        super.afterTestMethod(testContext);
    }
}
