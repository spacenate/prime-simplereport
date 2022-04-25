package gov.cdc.usds.simplereport.db.repository;

import gov.cdc.usds.simplereport.db.model.Organization;
import gov.cdc.usds.simplereport.db.model.Upload;
import java.util.List;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface UploadRepository
    extends AuditedEntityRepository<Upload>, JpaSpecificationExecutor<Upload> {

  List<Upload> findAllByOrganization(Organization o);
}
